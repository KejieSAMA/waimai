<script setup lang="ts">
import { useRoute } from "vue-router";
import AuditDetail from "../components/AuditDetail.vue";
import Merchants from "./Merchants.vue";
const route = useRoute();
</script>
<template><AuditDetail v-if="route.params.id" /><Merchants v-else /></template>
