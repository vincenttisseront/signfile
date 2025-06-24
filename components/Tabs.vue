<template>
  <div class="flex justify-center mb-8">
    <button
      :class="tabClass('sign')"
      @click="$emit('change', 'sign')"
    >Sign Script</button>
    <button
      :class="tabClass('verify')"
      @click="$emit('change', 'verify')"
    >Verify Signature</button>
    <button
      :class="tabClass('about')"
      @click="$emit('change', 'about')"
    >About</button>
  </div>
</template>

<script setup>
// filepath: c:\Users\vti\OneDrive - iBanFirst\Work in progress\Dev\SignFile\components\Tabs.vue
const props = defineProps({
  modelValue: String
})
const tabClass = (tab) =>
  [
    "px-6 py-2 rounded-t-lg font-semibold transition",
    props.modelValue === tab
      ? "bg-blue-600 text-white"
      : "bg-gray-100 text-blue-700 hover:bg-blue-100"
  ].join(' ')
</script>
