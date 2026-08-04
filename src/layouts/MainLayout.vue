<template>
  <div class="av-root">
  <q-layout view="hHh Lpr lFf" class="av-layout">
    <q-header class="av-header">
      <div class="flag-stripe" aria-hidden="true">
        <span class="flag-stripe__green" />
        <span class="flag-stripe__red" />
      </div>

      <div class="app-bar">
        <AppBrand :compact="$q.screen.lt.sm" />

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

          <template v-if="auth.ready">
            <router-link v-if="!auth.isLoggedIn" to="/entrar" class="btn-entrar">
              Entrar
            </router-link>
            <router-link
              v-else
              to="/perfil"
              class="btn-perfil"
              :class="{ 'is-active': isActive({ to: '/perfil' }) }"
            >
              <q-icon name="person_outline" size="20px" />
              <span v-if="$q.screen.gt.xs">{{ auth.cid || 'Perfil' }}</span>
            </router-link>
          </template>

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
        <router-link
          v-if="!auth.isLoggedIn"
          to="/registo"
          class="mobile-menu__link"
          @click="mobileOpen = false"
        >
          <q-icon name="person_add" size="20px" />
          Criar conta
        </router-link>
      </nav>
    </q-header>

    <div v-if="maisOpen" class="mais-backdrop" @click="maisOpen = false" />

    <q-page-container>
      <!-- minHeight auto: o Quasar por defeito força ~100vh e “cola” coisas ao ecrã -->
      <q-page class="av-page" :style-fn="pageStyleFn">
        <div v-if="!auth.ready || data.loading" class="boot-state">A carregar…</div>
        <div v-else-if="data.error" class="boot-state boot-state--err">
          <p>Não foi possível carregar os dados.</p>
          <p class="boot-state__detail">{{ data.error }}</p>
          <button type="button" class="btn btn--primary btn--sm" @click="retry">Tentar de novo</button>
        </div>
        <router-view v-else />
      </q-page>
    </q-page-container>
  </q-layout>

  <!-- Fora do q-layout: último bloco do documento, só no fim do scroll -->
  <footer class="av-footer">
    <div class="av-footer__inner">
      <p class="av-footer__brand">
        <strong>A Voto</strong> — Bancada Cidadã · independente · open source · RGPD
      </p>
      <nav class="av-footer__legal" aria-label="Informação legal">
        <router-link v-for="l in navLegal" :key="l.to" :to="l.to">{{ l.label }}</router-link>
      </nav>
      <p class="av-footer__note">
        Não é sítio oficial do Estado. Votos na plataforma não são vinculativos.
      </p>
    </div>
  </footer>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useQuasar } from 'quasar'
import AppBrand from '@/components/AppBrand.vue'
import { navPrincipal, navMais, navLegal } from '@/data/nav'
import { useAuthStore } from '@/stores/auth'
import { useDataStore } from '@/stores/data'

const $q = useQuasar()
const route = useRoute()
const auth = useAuthStore()
const data = useDataStore()
const mobileOpen = ref(false)
const maisOpen = ref(false)

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

async function retry() {
  await data.loadAll()
}

/** Altura natural do conteúdo — evita o min-height 100vh do Quasar que cola o footer ao viewport. */
function pageStyleFn() {
  return { minHeight: 'auto' }
}

onMounted(() => window.addEventListener('keydown', onKey))
onUnmounted(() => window.removeEventListener('keydown', onKey))
</script>

<style scoped lang="scss">
.av-root {
  display: block;
  min-height: 100%;
  background: var(--pt-paper-2);
}

.av-layout {
  min-height: 0 !important;
  height: auto !important;
  background: transparent;
}

.av-header {
  background: var(--pt-white) !important;
  color: var(--pt-ink) !important;
  box-shadow: none !important;
  border-bottom: 2px solid var(--pt-navy);
}

.app-bar {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.65rem 1rem;
  min-height: 58px;
  max-width: 1080px;
  margin: 0 auto;
  width: 100%;

  @media (min-width: 1024px) {
    padding: 0.7rem 1.5rem;
  }
}

.app-bar__nav {
  display: flex;
  align-items: center;
  gap: 0;
  flex: 1;
  margin-left: 0.75rem;
  height: 100%;
}

.app-bar__actions {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  position: relative;
  flex-shrink: 0;
}

.nav-link {
  appearance: none;
  border: none;
  background: transparent;
  font-family: var(--font-body);
  font-size: 0.88rem;
  font-weight: 600;
  color: var(--pt-muted);
  text-decoration: none;
  padding: 0.55rem 0.7rem;
  border-radius: 0;
  border-bottom: 2px solid transparent;
  margin-bottom: -2px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 0.15rem;
  line-height: 1.2;

  &:hover {
    color: var(--pt-navy);
  }

  &.is-active {
    color: var(--pt-navy);
    border-bottom-color: var(--pt-red);
  }
}

.mais {
  position: relative;
}

.mais__menu {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  min-width: 200px;
  background: var(--pt-white);
  border: 1px solid var(--pt-line);
  border-radius: 0;
  box-shadow: 2px 4px 0 rgba(12, 27, 51, 0.08);
  padding: 0.25rem 0;
  z-index: 1000;
}

.mais__item {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  padding: 0.55rem 0.9rem;
  border-radius: 0;
  text-decoration: none;
  color: var(--pt-ink);
  font-weight: 600;
  font-size: 0.88rem;

  &:hover {
    background: var(--pt-paper-2);
    color: var(--pt-navy);
  }

  &.is-active {
    background: var(--pt-paper-2);
    color: var(--pt-red);
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
  font-size: 0.85rem;
  font-weight: 700;
  padding: 0.4rem 0.85rem;
  border-radius: 2px;
  cursor: pointer;
  white-space: nowrap;
  line-height: 1.2;
  text-decoration: none;

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
  font-family: var(--font-mono);
  font-size: 0.78rem;
  font-weight: 600;
  padding: 0.4rem 0.65rem;
  border-radius: 2px;
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
}

.icon-btn {
  appearance: none;
  border: 1px solid var(--pt-line);
  background: var(--pt-white);
  color: var(--pt-navy);
  width: 38px;
  height: 38px;
  border-radius: 2px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;

  &:hover {
    border-color: var(--pt-navy);
  }
}

.mobile-menu {
  display: flex;
  flex-direction: column;
  padding: 0.25rem 0 0.5rem;
  border-top: 1px solid var(--pt-line);
  background: var(--pt-white);
}

.mobile-menu__link {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  padding: 0.75rem 1rem;
  border-radius: 0;
  text-decoration: none;
  color: var(--pt-ink);
  font-weight: 600;
  font-size: 0.95rem;
  border-left: 3px solid transparent;

  &:hover {
    background: var(--pt-paper-2);
  }

  &.is-active {
    background: var(--pt-paper-2);
    border-left-color: var(--pt-red);
    color: var(--pt-navy);
  }
}

.av-page {
  /* Altura = conteúdo; o footer é o último bloco do scroll, nunca sticky/fixed */
  display: block;
  min-height: 0 !important;
  height: auto !important;
}

/* Rodapé no fluxo normal — só aparece depois de fazer scroll até ao fim da página */
.av-footer {
  display: block;
  width: 100%;
  margin-top: 2.5rem;
  position: static !important;
  inset: auto !important;
  z-index: auto !important;
  transform: none !important;
  background: var(--pt-navy);
  color: rgba(255, 255, 255, 0.88);
  border-top: 3px solid var(--pt-red);
}

.av-footer__inner {
  max-width: 1080px;
  margin: 0 auto;
  padding: 1.1rem 1rem 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
  text-align: center;

  @media (min-width: 640px) {
    padding: 1.15rem 1.5rem 1.35rem;
  }
}

.av-footer__brand {
  margin: 0;
  font-size: 0.88rem;
  font-weight: 500;
  line-height: 1.4;
  color: rgba(255, 255, 255, 0.92);

  strong {
    font-weight: 800;
    color: #fff;
  }
}

.av-footer__legal {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.35rem 1.1rem;

  a {
    color: #fff;
    font-size: 0.84rem;
    font-weight: 700;
    text-decoration: none;
    border-bottom: 1px solid transparent;
    padding-bottom: 1px;

    &:hover,
    &.router-link-active {
      border-bottom-color: var(--pt-red);
      color: #fff;
    }
  }
}

.av-footer__note {
  margin: 0;
  font-size: 0.75rem;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.62);
  line-height: 1.4;
}

.boot-state {
  padding: 3rem 1.25rem;
  text-align: center;
  color: var(--pt-muted);
  font-weight: 600;

  &--err {
    color: var(--pt-red-dark);
  }

  &__detail {
    font-size: 0.85rem;
    font-weight: 500;
    color: var(--pt-muted);
    max-width: 32rem;
    margin: 0.5rem auto 1rem;
  }
}
</style>
