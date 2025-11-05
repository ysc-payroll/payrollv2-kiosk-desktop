<template>
  <div>
    <!-- Loading State -->
    <div v-if="isLoading" class="flex justify-center items-center py-12">
      <div class="animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
    </div>

    <!-- Table -->
    <table v-else class="w-full">
      <thead class="bg-slate-50/50 border-b border-slate-200">
        <tr>
          <th class="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-700">
            Requested Date
          </th>
          <th class="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-700">
            Employee
          </th>
          <th class="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-700">
            Undertime Date
          </th>
          <th class="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-700">
            Applied
          </th>
          <th class="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-700">
            Approved
          </th>
          <th class="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-700">
            Reason
          </th>
          <th class="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-700">
            Status
          </th>
          <th class="px-6 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-700">
            <svg class="h-4 w-4 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
          </th>
          <th class="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-700">
            Actions
          </th>
        </tr>
      </thead>
      <tbody class="divide-y divide-slate-200">
        <tr
          v-for="record in records"
          :key="record.id"
          class="transition hover:bg-slate-50/50"
        >
          <!-- Requested Date -->
          <td class="px-6 py-4 text-sm text-slate-900">
            {{ record.requested_date }}
          </td>

          <!-- Employee -->
          <td class="px-6 py-4 text-sm font-medium text-slate-900">
            {{ record.employee }}
          </td>

          <!-- Undertime Date -->
          <td class="px-6 py-4 text-sm text-slate-900">
            {{ record.application_date }}
          </td>

          <!-- Applied Time -->
          <td class="px-6 py-4 text-sm text-slate-900">
            {{ record.applied_display }}
          </td>

          <!-- Approved Time -->
          <td class="px-6 py-4 text-sm text-slate-900">
            {{ record.approved_display || '-' }}
          </td>

          <!-- Reason -->
          <td class="px-6 py-4 text-sm text-slate-900 max-w-xs truncate" :title="record.reason">
            {{ record.reason || '-' }}
          </td>

          <!-- Status with inline timeline -->
          <td class="px-6 py-4 text-sm">
            <div class="flex flex-col gap-1">
              <span
                class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium w-fit"
                :class="getStatusClass(record.status)"
              >
                {{ record.status_display }}
              </span>

              <!-- Timeline info -->
              <div v-if="record.approved_by" class="text-xs text-slate-500">
                <div>{{ record.approved_by }}</div>
                <div>{{ record.approved_date }}</div>
              </div>
              <div v-else-if="record.reviewed_by" class="text-xs text-slate-500">
                <div>{{ record.reviewed_by }}</div>
                <div>{{ record.reviewed_date }}</div>
              </div>
              <div v-else-if="record.disapproved_by" class="text-xs text-slate-500">
                <div>{{ record.disapproved_by }}</div>
                <div>{{ record.disapproved_date }}</div>
              </div>
              <div v-else-if="record.cancelled_by" class="text-xs text-slate-500">
                <div>{{ record.cancelled_by }}</div>
                <div>{{ record.cancelled_date }}</div>
              </div>
            </div>
          </td>

          <!-- Attachment Indicator -->
          <td class="px-6 py-4 text-center">
            <svg
              v-if="record.has_attachment"
              class="h-5 w-5 mx-auto text-green-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              title="Has attachment"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
            <svg
              v-else
              class="h-5 w-5 mx-auto text-slate-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              title="No attachment"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
          </td>

          <!-- Actions Dropdown -->
          <td class="px-6 py-4 text-right">
            <div class="relative inline-block">
              <button
                @click="toggleDropdown(record.id)"
                class="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition"
              >
                Actions
                <span class="w-px h-4 bg-blue-400"></span>
                <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              <!-- Dropdown Menu -->
              <div
                v-if="openDropdownId === record.id"
                class="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-slate-200 z-10"
              >
                <div class="py-1">
                  <!-- Edit (pending only) -->
                  <button
                    v-if="record.is_editable && permissions.canUpdate"
                    @click="handleAction('edit', record)"
                    class="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                  >
                    <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Edit
                  </button>
                </div>
              </div>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const props = defineProps({
  records: {
    type: Array,
    required: true
  },
  isLoading: {
    type: Boolean,
    default: false
  },
  permissions: {
    type: Object,
    default: () => ({
      canUpdate: false,
      canDelete: false,
      canCancel: false
    })
  }
})

const emit = defineEmits(['edit'])

const openDropdownId = ref(null)

const toggleDropdown = (id) => {
  openDropdownId.value = openDropdownId.value === id ? null : id
}

const handleAction = (action, record) => {
  emit(action, record)
  openDropdownId.value = null
}

const getStatusClass = (status) => {
  const classes = {
    pending: 'bg-amber-100 text-amber-800',
    approved: 'bg-green-100 text-green-800',
    disapproved: 'bg-red-100 text-red-800',
    cancelled: 'bg-slate-100 text-slate-800'
  }
  return classes[status] || 'bg-slate-100 text-slate-800'
}

// Close dropdown when clicking outside
if (typeof document !== 'undefined') {
  document.addEventListener('click', (e) => {
    if (!e.target.closest('button')) {
      openDropdownId.value = null
    }
  })
}
</script>
