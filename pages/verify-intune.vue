<template>
  <PageLayout title="Verify Intune Scripts" description="Specialized verification for Intune and MDM-deployed scripts">
    <div v-if="!redirected" class="bg-blue-50 p-4 rounded-lg border border-blue-200 mb-4">
      <p class="text-blue-800">Redirecting to unified verification page...</p>
    </div>
  </PageLayout>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';

const redirected = ref(false);
const router = useRouter();

onMounted(() => {
  // Redirect to unified page with intune tab selected
  setTimeout(() => {
    redirected.value = true;
    router.push('/verify-unified?tab=intune');
  }, 100);
});
</script>