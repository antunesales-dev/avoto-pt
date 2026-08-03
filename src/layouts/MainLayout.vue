<template>
  <q-layout view="hHh lpR fFf" class="av-layout">
    <q-header class="av-header">
      <div class="flag-stripe" aria-hidden="true">
        <span class="flag-stripe__green" />
        <span class="flag-stripe__red" />
      </div>

      <div class="app-bar">
        <AppBrand :compact="$q.screen.lt.sm" />

        <!-- Primary nav — desktop -->
        <nav v-if="$q.screen.gt.sm" class="app-bar__nav" aria-label="Principal">
          <router-link
            v-for="item in navPrincipal"
            :key="item.to"
            :to="item.to"
            class="nav-link"
            :class="{ 'is-active': isActive(item) }"
          >
            {{ item.label }}
          </router-link>
        </nav>

        <div class="app-bar__actions">
          <!-- Mais (desktop only) -->
          <div v-if="$q.screen.gt.sm" class="mais">
            <button
              type="button"
              class="nav-link mais__btn"
              :class="{ 'is-active': maisOpen || isSecondaryActive }"
              aria-haspopup="menu"
              :aria-expanded="maisOpen"
              @click="maisOpen = !maisOpen"
            >
              Mais
              <q-icon :name="maisOpen ? 'expand_less' : 'expand_more'" size="18px" />
            </button>
            <div v-if="maisOpen" class="mais__menu" role="menu">
              <router-link
                v-for="item in navMais"
                :key="item.to"
                :to="item.to"
                class="mais__item"
                role="menuitem"
                :class="{ 'is-active': isActive(item) }"
                @click="maisOpen = false"
              >
                <q-icon :name="item.icon" size="18px" />
                {{ item.label }}
              </router-link>
            </div>
          </div>

          <!-- Conta: mutuamente exclusivos -->
          <button
            v-if="!auth.isLoggedIn"
            type="button"
            class="btn-entrar"
            @click="onEntrar"
          >
            Entrar
          </button>
          <router-link
            v-else
            to="/perfil"
            class="btn-perfil"
            :class="{ 'is-active': isActive({ to: '/perfil' }) }"
            :aria-label="$q.screen.lt.sm ? 'Perfil' : undefined"
          >
            <q-icon name="person_outline" size="20px" />
            <span v-if="$q.screen.gt.xs">Perfil</span>
          </router-link>

          <!-- Mobile menu toggle -->
          <button
            v-if="$q.screen.lt.md"
            type="button"
            class="icon-btn"
            :aria-expanded="mobileOpen"
            aria-controls="mobile-menu"
            aria-label="Menu"
            @click="mobileOpen = !mobileOpen"
          >
            <q-icon :name="mobileOpen ? 'close' : 'menu'" size="24px" />
          </button>
        </div>
      </div>

      <!-- Mobile: primary + mais only (conta já está na barra) -->
      <nav
        v-if="$q.screen.lt.md && mobileOpen"
        id="mobile-menu"
        class="mobile-menu"
        aria-label="Menu"
      >
        <router-link
          v-for="item in navMobile"
          :key="item.to"
          :to="item.to"
          class="mobile-menu__link"
          :class="{ 'is-active': isActive(item) }"
          @click="mobileOpen = false"
        >
          <q-icon :name="item.icon" size="20px" />
          {{ item.label }}
        </router-link>
      </nav>
    </q-header>

    <div v-if="maisOpen" class="mais-backdrop" @click="maisOpen = false" />

    <q-page-container>
      <q-page class="av-page">
        <router-view />
      </q-page>
    </q-page-container>
  </q-layout>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import AppBrand from '@/components/AppBrand.vue'
import { navPrincipal, navMais } from '@/data/mock'
import { useAuthStore } from '@/stores/auth'

const $q = useQuasar()
const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const mobileOpen = ref(false)
const maisOpen = ref(false)

function onEntrar() {
  // Demo: entra com sessão fictícia (Supabase Auth na fase real)
  auth.loginDemo()
  router.push('/perfil')
}

const navMobile = computed(() => [...navPrincipal, ...navMais])

watch(
  () => route.fullPath,
  () => {
    mobileOpen.value = false
    maisOpen.value = false
  },
)

function isActive(item) {
  if (item.exact) return route.path === item.to
  return route.path === item.to || route.path.startsWith(item.to + '/')
}

const isSecondaryActive = computed(() => navMais.some((item) => isActive(item)))

function onKey(e) {
  if (e.key === 'Escape') {
    maisOpen.value = false
    mobileOpen.value = false
  }
}

onMounted(() => window.addEventListener('keydown', onKey))
onUnmounted(() => window.removeEventListener('keydown', onKey))
</script>

<style scoped lang="scss">
.av-layout {
  min-height: 100vh;
  background: var(--pt-cream);
}

.av-header {
  background: var(--pt-paper) !important;
  color: var(--pt-ink) !important;
  box-shadow: none !important;
  border-bottom: 1px solid var(--pt-border);
}

.app-bar {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.55rem 0.85rem;
  min-height: 56px;
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;

  @media (min-width: 1024px) {
    padding: 0.55rem 1.25rem;
    gap: 1rem;
  }
}

.app-bar__nav {
  display: flex;
  align-items: center;
  gap: 0.1rem;
  flex: 1;
  margin-left: 0.35rem;
}

.app-bar__actions {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  position: relative;
  flex-shrink: 0;
}

.nav-link {
  appearance: none;
  border: none;
  background: transparent;
  font-family: var(--font-body);
  font-size: 0.92rem;
  font-weight: 600;
  color: var(--pt-muted);
  text-decoration: none;
  padding: 0.45rem 0.7rem;
  border-radius: 8px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 0.15rem;
  line-height: 1.2;

  &:hover {
    color: var(--pt-navy);
    background: rgba(0, 32, 91, 0.05);
  }

  &.is-active {
    color: var(--pt-green-dark);
    background: rgba(4, 106, 56, 0.1);
  }
}

.mais {
  position: relative;
}

.mais__menu {
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  min-width: 200px;
  background: var(--pt-paper);
  border: 1px solid var(--pt-border);
  border-radius: 12px;
  box-shadow: 0 8px 28px rgba(28, 25, 23, 0.12);
  padding: 0.35rem;
  z-index: 1000;
}

.mais__item {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.6rem 0.75rem;
  border-radius: 8px;
  text-decoration: none;
  color: var(--pt-ink);
  font-weight: 600;
  font-size: 0.9rem;

  &:hover {
    background: rgba(4, 106, 56, 0.07);
    color: var(--pt-green-dark);
  }

  &.is-active {
    background: rgba(4, 106, 56, 0.1);
    color: var(--pt-green-dark);
  }
}

.mais-backdrop {
  position: fixed;
  inset: 0;
  z-index: 50;
}

.btn-entrar {
  appearance: none;
  border: 1.5px solid var(--pt-navy);
  background: transparent;
  color: var(--pt-navy);
  font-family: var(--font-body);
  font-size: 0.88rem;
  font-weight: 700;
  padding: 0.4rem 0.75rem;
  border-radius: 8px;
  cursor: pointer;
  white-space: nowrap;
  line-height: 1.2;

  &:hover {
    background: var(--pt-navy);
    color: white;
  }
}

.btn-perfil {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  text-decoration: none;
  font-family: var(--font-body);
  font-size: 0.88rem;
  font-weight: 700;
  padding: 0.4rem 0.7rem;
  border-radius: 8px;
  background: var(--pt-green);
  color: white;
  border: 1.5px solid var(--pt-green);
  white-space: nowrap;
  line-height: 1.2;

  &:hover {
    background: var(--pt-green-dark);
    border-color: var(--pt-green-dark);
    color: white;
  }

  &.is-active {
    box-shadow: 0 0 0 2px rgba(4, 106, 56, 0.25);
  }

  @media (max-width: 599px) {
    padding: 0.4rem 0.55rem;
  }
}

.icon-btn {
  appearance: none;
  border: 1px solid var(--pt-border);
  background: var(--pt-cream);
  color: var(--pt-navy);
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;

  &:hover {
    border-color: var(--pt-green);
    color: var(--pt-green-dark);
  }
}

.mobile-menu {
  display: flex;
  flex-direction: column;
  padding: 0.35rem 0.65rem 0.75rem;
  border-top: 1px solid var(--pt-border);
  background: var(--pt-paper);
}

.mobile-menu__link {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  padding: 0.7rem 0.75rem;
  border-radius: 8px;
  text-decoration: none;
  color: var(--pt-ink);
  font-weight: 600;
  font-size: 0.95rem;

  &:hover {
    background: rgba(4, 106, 56, 0.07);
  }

  &.is-active {
    background: rgba(4, 106, 56, 0.12);
    color: var(--pt-green-dark);
  }
}

.av-page {
  min-height: calc(100vh - 60px);
}
</style>
