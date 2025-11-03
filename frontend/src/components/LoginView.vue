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
const email = ref('')
const password = ref('')
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
  // DEVELOPMENT MODE: Auto-login without authentication
  // TODO: Remove this bypass when API is ready

  isLoading.value = true
  errorMessage.value = ''

  try {
    // Simulate a brief loading delay for better UX
    await new Promise(resolve => setTimeout(resolve, 500))

    // Auto-login with mock user data
    emit('login-success', {
      user: {
        id: 1,
        email: email.value || 'admin@company.com',
        name: 'Admin User',
        role: 'admin'
      },
      rememberMe: rememberMe.value
    })
  } catch (error) {
    console.error('Login error:', error)
    errorMessage.value = 'An error occurred during login. Please try again.'
  } finally {
    isLoading.value = false
  }

  /*
  // PRODUCTION CODE: Uncomment this when API is ready
  if (!email.value || !password.value) {
    errorMessage.value = 'Please enter both email and password'
    return
  }

  isLoading.value = true
  errorMessage.value = ''

  try {
    if (!kioskBridge) {
      throw new Error('Bridge not available')
    }

    // Call bridge method to authenticate
    const result = await kioskBridge.authenticateUser(email.value, password.value, rememberMe.value)
    const data = JSON.parse(result)

    if (data.success) {
      // Emit success event to parent component
      emit('login-success', {
        user: data.user,
        rememberMe: rememberMe.value
      })
    } else {
      errorMessage.value = data.error || 'Invalid email or password'
    }
  } catch (error) {
    console.error('Login error:', error)
    errorMessage.value = 'An error occurred during login. Please try again.'
  } finally {
    isLoading.value = false
  }
  */
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
