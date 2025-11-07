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
          <th
            v-for="column in config.columns"
            :key="column.key"
            class="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-700"
            :class="column.align === 'center' ? 'text-center' : column.align === 'right' ? 'text-right' : 'text-left'"
          >
            <component :is="column.headerComponent" v-if="column.headerComponent" />
            <template v-else>{{ column.label }}</template>
          </th>
        </tr>
      </thead>
      <tbody class="divide-y divide-slate-200">
        <tr
          v-for="record in records"
          :key="record.id"
          class="transition hover:bg-slate-50/50"
        >
          <td
            v-for="column in config.columns"
            :key="column.key"
            class="px-6 py-4 text-sm"
            :class="[
              column.align === 'center' ? 'text-center' : column.align === 'right' ? 'text-right' : 'text-left',
              column.fontWeight === 'medium' ? 'font-medium text-slate-900' : 'text-slate-900',
              column.maxWidth ? 'max-w-xs truncate' : ''
            ]"
            :title="column.tooltip ? record[column.key] : undefined"
          >
            <!-- Custom render function -->
            <component
              v-if="column.render"
              :is="column.render"
              :record="record"
              :permissions="permissions"
              :openDropdownId="openDropdownId"
              :toggleDropdown="toggleDropdown"
              :handleAction="handleAction"
            />
            <!-- Default rendering -->
            <template v-else>
              {{ formatValue(record, column) }}
            </template>
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
  },
  config: {
    type: Object,
    required: true
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

const formatValue = (record, column) => {
  const value = record[column.key]

  // Handle null/undefined values
  if (value === null || value === undefined) {
    return column.fallback || '-'
  }

  // Custom formatter function
  if (column.formatter) {
    return column.formatter(record)
  }

  return value
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
