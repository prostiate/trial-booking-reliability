<script setup lang="ts">
const props = defineProps<{
  status: string;
}>();

const badgeConfig = computed(() => {
  switch (props.status) {
    case 'confirmed':
      return {
        color: 'success' as const,
        label: 'confirmed',
      };
    case 'pending_payment':
      return {
        color: 'warning' as const,
        label: 'pending_payment',
      };
    case 'expired_conflict':
      return {
        color: 'error' as const,
        label: 'expired_conflict',
      };
    case 'payment_failed':
      return {
        color: 'error' as const,
        label: 'payment_failed',
      };
    default:
      return {
        color: 'neutral' as const,
        label: props.status,
      };
  }
});
</script>

<template>
  <UBadge :color="badgeConfig.color" variant="subtle" size="sm" class="font-semibold">
    {{ badgeConfig.label }}
  </UBadge>
</template>
