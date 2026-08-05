<template>
  <div class="page-shell auth-page">
    <h1 class="page-title">Criar conta</h1>
    <p class="page-subtitle">
      A A Voto entra <strong>só com email</strong> (link + código). Não usamos palavra-passe: o
      email tem de ser validado para haver sessão — um CID por pessoa.
    </p>

    <div class="av-card av-card-pad stack">
      <div class="notice notice-info">
        Sem password: menos risco de reutilização e recuperação confusa; o magic link
        <strong>prova que controla o email</strong>.
      </div>
      <router-link class="btn btn--primary" :to="{ name: 'entrar', query: route.query }">
        Continuar com email
      </router-link>
      <p class="auth-switch">
        Já tem conta?
        <router-link to="/entrar">Entrar</router-link>
      </p>
      <p class="auth-legal">
        Ao continuar, aceita os
        <router-link to="/termos">Termos de uso</router-link>
        e a
        <router-link to="/privacidade">Política de Privacidade</router-link>.
      </p>
    </div>
  </div>
</template>

<script setup>
import { useRoute } from 'vue-router'
import '@/css/auth.scss'

const route = useRoute()
</script>

<style scoped lang="scss">
.stack {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  align-items: flex-start;
}
</style>
