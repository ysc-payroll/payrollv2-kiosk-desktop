<template>
  <GenericApplicationTable
    :records="records"
    :isLoading="isLoading"
    :permissions="permissions"
    :config="holidayTableConfig"
    @edit="$emit('edit', $event)"
  />
</template>

<script setup>
import GenericApplicationTable from '../shared/GenericApplicationTable.vue'
import { holidayTableConfig } from '../../configs/tableConfigs.js'

defineProps({
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

defineEmits(['edit'])
</script>
