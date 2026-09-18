<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { apiSeguridad } from '@/utils/seguridad'
const users=ref<any[]>([]),roles=ref<any[]>([]),error=ref('')
const cargar=async()=>{try{[users.value,roles.value]=await Promise.all([apiSeguridad('/usuarios'),apiSeguridad('/roles')])}catch(e:any){error.value=e.message}}
onMounted(cargar)
</script>
<template><VCard><VCardItem><VCardTitle>Usuarios</VCardTitle><VCardSubtitle>Administración de cuentas, empresa, departamento y rol.</VCardSubtitle></VCardItem><VCardText><VAlert v-if="error" type="error">{{error}}</VAlert><VDataTable :items="users" :headers="[{title:'Nombre',key:'nombre_completo'},{title:'Correo',key:'email'},{title:'Empresa',key:'empresa_id'},{title:'Departamento',key:'departamento'},{title:'Rol',key:'rol'}]"><template #item.empresa_id="{item}">{{item.empresa_id||'Sin asignar'}}</template><template #item.departamento="{item}">{{item.departamento||'Sin asignar'}}</template></VDataTable></VCardText></VCard></template>
