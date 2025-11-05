<template>
  <div class="officialbusiness-view h-full overflow-y-auto">
    <div class="p-6">
      <!-- Header -->
      <div class="flex items-center justify-between mb-6">
        <div>
          <h1 class="text-3xl font-bold text-slate-900">Official Business Management</h1>
          <p class="text-sm text-slate-600 mt-1">
            Manage official business trips and company-related activities
          </p>
        </div>
      </div>

      <!-- Placeholder Content -->
      <div class="relative isolate overflow-hidden rounded-2xl bg-white/70 shadow-xl ring-1 ring-black/5 backdrop-blur p-12">
        <div class="text-center">
          <svg class="mx-auto h-16 w-16 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          <h3 class="mt-6 text-xl font-medium text-slate-900">Official Business Module</h3>
          <p class="mt-2 text-sm text-slate-600">
            This feature is under development and will be available in Phase 2.
          </p>
          <div class="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p class="text-sm text-blue-800">
              <strong>Planned Features:</strong><br>
              • Submit official business requests<br>
              • Track business trip itineraries<br>
              • Approve/reject official business applications<br>
              • Manage travel allowances and expenses
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
// This is a placeholder component for the Official Business view
// Will be fully implemented in Phase 2
</script>

<style scoped>
.officialbusiness-view {
  background: linear-gradient(to bottom right,
    rgb(240 249 255),
    rgb(224 231 255),
    rgb(250 232 255)
  );
}

/* Custom scrollbar */
.officialbusiness-view::-webkit-scrollbar {
  width: 8px;
}

.officialbusiness-view::-webkit-scrollbar-track {
  background: transparent;
}

.officialbusiness-view::-webkit-scrollbar-thumb {
  background: rgba(148, 163, 184, 0.3);
  border-radius: 4px;
}

.officialbusiness-view::-webkit-scrollbar-thumb:hover {
  background: rgba(148, 163, 184, 0.5);
}
</style>
