<template>
  <GenericApplicationTable
    :records="records"
    :isLoading="isLoading"
    :permissions="permissions"
    :config="restdayTableConfig"
    @edit="$emit('edit', $event)"
  />
</template>

<script setup>
import GenericApplicationTable from '../shared/GenericApplicationTable.vue'
import { restdayTableConfig } from '../../configs/tableConfigs.js'

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
