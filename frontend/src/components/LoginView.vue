<template>
  <div class="min-h-screen bg-gradient-to-br from-sky-50 via-indigo-50 to-fuchsia-50 flex items-center justify-center px-4 py-10">
    <div class="w-full max-w-md">
      <!-- Header with Logo -->
      <div class="mb-6 flex items-center justify-center">
        <div class="flex items-center gap-2">
          <div class="grid h-10 w-10 place-items-center rounded-lg bg-blue-500 text-white">
            <span class="text-lg font-bold">A</span>
          </div>
          <span class="text-lg font-medium text-slate-800">{{ companyName }}</span>
        </div>
      </div>

      <!-- Login Card -->
      <div class="relative isolate overflow-hidden rounded-2xl bg-white/70 shadow-xl ring-1 ring-black/5 backdrop-blur">
        <!-- Decorative Gradient Blobs -->
        <div class="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-gradient-to-br from-blue-500/30 via-indigo-300/30 to-fuchsia-300/30 blur-3xl"></div>
        <div class="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-gradient-to-tr from-fuchsia-300/30 via-blue-500/30 to-sky-300/30 blur-3xl"></div>

        <!-- Login Form -->
        <form @submit.prevent="handleLogin" class="relative p-8 sm:p-10 space-y-6">
          <header>
            <h1 class="text-2xl font-semibold tracking-tight text-slate-900">Login</h1>
            <p class="mt-1 text-sm text-slate-600">Enter your credentials to continue.</p>
          </header>

          <!-- Email Field -->
          <div class="space-y-4">
            <label class="block">
              <span class="mb-2 block text-sm font-medium text-slate-700">Email</span>
              <input
                v-model="email"
                type="email"
                required
                autocomplete="email"
                class="block w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20"
                placeholder="you@company.com"
                :disabled="isLoading"
              />
            </label>

            <!-- Password Field -->
            <label class="block">
              <span class="mb-2 block text-sm font-medium text-slate-700">Password</span>
              <input
                v-model="password"
                type="password"
                required
                autocomplete="current-password"
                class="block w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20"
                placeholder="••••••••"
                :disabled="isLoading"
              />
            </label>
          </div>

          <!-- Remember Me & Forgot Password -->
          <div class="flex items-center justify-between">
            <label class="inline-flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
              <input
                v-model="rememberMe"
                type="checkbox"
                class="w-4 h-4 rounded border-slate-300 text-blue-500 focus:ring-blue-500/30"
                :disabled="isLoading"
              />
              Remember me
            </label>
            <a href="#" class="text-sm text-blue-500 hover:text-blue-600" @click.prevent="handleForgotPassword">
              Forgot password?
            </a>
          </div>

          <!-- Error Message -->
          <div v-if="errorMessage" class="rounded-xl bg-red-50 border border-red-200 px-4 py-3">
            <p class="text-sm text-red-600">{{ errorMessage }}</p>
          </div>

          <!-- Submit Button -->
          <button
            type="submit"
            :disabled="isLoading"
            class="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-500 px-4 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-blue-600 focus:outline-none focus:ring-4 focus:ring-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg
              v-if="isLoading"
              class="animate-spin h-4 w-4 text-white"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span v-if="isLoading">Signing in...</span>
            <span v-else>Sign in</span>
          </button>
        </form>
      </div>

      <!-- Version Info -->
      <div class="mt-4 text-center">
        <p class="text-xs text-slate-500">{{ appVersion }}</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import apiService from '../services/api.js'

// Props
const props = defineProps({
  appVersion: {
    type: String,
    default: 'v2.0.0'
  }
})

// Emits
const emit = defineEmits(['login-success'])

// Bridge reference
let kioskBridge = null

// Form state
const email = ref('zip1@gmail.com')
const password = ref('722436Aa!')
const rememberMe = ref(false)
const isLoading = ref(false)
const errorMessage = ref('')
const companyName = ref('ABBA Payroll')

// Load company information
const loadCompanyInfo = async () => {
  if (!kioskBridge) {
    console.warn('Bridge not available, using default company name')
    return
  }

  try {
    const result = await kioskBridge.getCurrentCompany()
    const data = JSON.parse(result)

    if (data.success && data.company && data.company.name) {
      companyName.value = data.company.name
    }
  } catch (error) {
    console.error('Error loading company info:', error)
  }
}

// Handle login submission
const handleLogin = async () => {
  // Validate inputs
  if (!email.value || !password.value) {
    errorMessage.value = 'Please enter both email and password'
    return
  }

  isLoading.value = true
  errorMessage.value = ''

  try {
    // Call API to authenticate
    const result = await apiService.login(email.value, password.value)

    if (result.success) {
      // Successful login - now get complete user info
      const userInfoResult = await apiService.getUserInfo()

      if (userInfoResult.success) {
        const userData = userInfoResult.data

        // Build user display name
        let displayName = `${userData.first_name} ${userData.last_name}`.trim()
        if (!displayName) {
          displayName = userData.email // Fallback to email if no name
        }

        console.log('🟢 LoginView: userData from API:', userData)
        console.log('🟢 LoginView: Company object:', userData.company)

        // Emit success with complete user and company data
        const loginSuccessData = {
          user: {
            id: userData.id,
            email: userData.email,
            name: displayName,
            firstName: userData.first_name,
            lastName: userData.last_name,
            isSuperuser: userData.is_superuser,
            isStaff: userData.is_staff
          },
          company: userData.company,
          employee: userData.employee,
          roles: userData.roles || [],
          permissions: userData.permissions,
          rights: userData.rights, // Include original rights
          portalAccessType: userData.portal_access_type,
          canSwitchPortals: userData.can_switch_portals,
          hasAdminAccess: userData.admin_portal_access,
          hasEmployeeAccess: userData.employee_portal_access,
          rememberMe: rememberMe.value
        };

        console.log('🟢 LoginView: Emitting login-success with data:', loginSuccessData);
        emit('login-success', loginSuccessData);
      } else {
        // Failed to get user info, but login was successful
        console.error('❌ LoginView: getUserInfo failed!', userInfoResult);
        console.error('❌ LoginView: Error message:', userInfoResult.message);

        // Use basic user data from login response
        emit('login-success', {
          user: {
            id: result.user.pk,
            email: result.user.email,
            name: `${result.user.first_name} ${result.user.last_name}`,
            firstName: result.user.first_name,
            lastName: result.user.last_name
          },
          hasAdminAccess: result.hasAdminAccess,
          hasEmployeeAccess: result.hasEmployeeAccess,
          rememberMe: rememberMe.value
        })
      }
    } else if (result.requiresOTP) {
      // 2FA required
      errorMessage.value = 'Two-factor authentication is required. This feature is coming soon.'
      // TODO: Implement OTP flow
    } else if (result.unverified) {
      // Account not verified
      errorMessage.value = 'Your account email is not verified. Please check your email.'
    } else {
      // Other errors
      errorMessage.value = result.message || 'Invalid email or password'
    }
  } catch (error) {
    console.error('Login error:', error)
    errorMessage.value = error.message || 'An error occurred during login. Please try again.'
  } finally {
    isLoading.value = false
  }
}

// Handle forgot password
const handleForgotPassword = () => {
  // For desktop app, this could open a dialog or show instructions
  alert('Please contact your administrator to reset your password.')
}

// Initialize bridge on mount
onMounted(() => {
  if (window.qt && window.qt.webChannelTransport) {
    new window.QWebChannel(window.qt.webChannelTransport, (channel) => {
      kioskBridge = channel.objects.kioskBridge
      console.log('PyQt bridge connected in LoginView')

      // Load company info after bridge is ready
      loadCompanyInfo()
    })
  } else {
    console.warn('PyQt bridge not available - running in browser mode')
  }
})
</script>

<style scoped>
/* Custom scrollbar for webkit browsers */
::-webkit-scrollbar {
  width: 8px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: rgba(148, 163, 184, 0.3);
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: rgba(148, 163, 184, 0.5);
}
</style>
