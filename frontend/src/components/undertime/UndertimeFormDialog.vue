<template>
  <GenericTimeApplicationDialog
    :isOpen="isOpen"
    :mode="mode"
    :selectedRecord="selectedRecord"
    :employees="employees"
    :canSelectEmployee="canSelectEmployee"
    :isSaving="isSaving"
    :config="undertimeDialogConfig"
    @close="$emit('close')"
    @submit="$emit('submit', $event)"
  />
</template>

<script setup>
import GenericTimeApplicationDialog from '../shared/GenericTimeApplicationDialog.vue'
import { undertimeDialogConfig } from '../../configs/dialogConfigs.js'

defineProps({
  isOpen: Boolean,
  mode: {
    type: String,
    default: 'create'
  },
  selectedRecord: Object,
  employees: {
    type: Array,
    default: () => []
  },
  canSelectEmployee: Boolean,
  isSaving: Boolean
})

defineEmits(['close', 'submit'])
</script>
