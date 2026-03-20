<template>
  <div class="page-container" :class="{ 'admin-mode': isAdminPage }" ref="layoutRef">
    <div class="page-content">
      <slot></slot>
    </div>
  </div>
</template>

<script setup>
const route = useRoute()
const isAdminPage = computed(() => route.path.includes('/admin'))
const layoutRef = ref(null)
</script>


