<template>
  <div class="page-shell">
    <h1 class="page-title">Digest diário</h1>
    <p class="page-subtitle">
      O que foi a voto e <strong>como</strong> — partidos na AR e cidadãos na A Voto. Só factos dos
      dados da plataforma (sem interpretação nem AI).
    </p>

    <div class="notice notice-info" style="margin-bottom: 1.25rem">
      Gerado a partir da base:
      <code>ar-sync</code> → <code>daily-digest</code>. Cada cartão lista todos os campos úteis:
      título, estado, partidos, cidadãos e ligações oficiais.
    </div>

    <p v-if="finance.loading" class="muted">A carregar…</p>
    <p v-else-if="!finance.digests.length" class="muted">
      Ainda não há digests. O job diário preenche esta lista.
    </p>

    <div class="digest-list">
      <article v-for="d in finance.digests" :key="d.id" class="av-card digest">
        <div class="flag-stripe" aria-hidden="true">
          <span class="flag-stripe__green" />
          <span class="flag-stripe__red" />
        </div>
        <div class="av-card-pad">
          <div class="digest__head">
            <h2 class="digest__title">{{ d.title }}</h2>
            <span class="badge badge--navy">{{ formatDate(d.digest_date) }}</span>
          </div>
          <p class="digest__summary">{{ d.summary }}</p>
          <p v-if="d.generated_at" class="digest__meta">
            Gerado {{ formatDate(d.generated_at) }}
            <template v-if="d.source"> · fonte: {{ d.source }}</template>
            · {{ (d.items || []).length }} item(ns)
          </p>

          <div v-if="d.items?.length" class="digest__items">
            <div v-for="(it, idx) in d.items" :key="it.iniciativa_id || idx" class="digest-item">
              <div class="digest-item__badges">
                <router-link
                  v-if="it.iniciativa_id"
                  :to="`/iniciativas/${it.iniciativa_id}`"
                  class="digest-item__id"
                >
                  {{ it.id_oficial || it.iniciativa_id }}
                </router-link>
                <span v-else class="badge badge--muted">{{ it.id_oficial || '—' }}</span>
                <span v-if="it.tipo" class="badge badge--navy">{{ it.tipo }}</span>
                <span v-if="it.estado" class="badge" :class="estadoBadge(it.estado)">
                  {{ estadoLabel(it.estado) }}
                </span>
                <span v-if="it.tema" class="badge badge--muted">{{ it.tema }}</span>
              </div>

              <h3 class="digest-item__titulo">{{ it.titulo || 'Sem título' }}</h3>

              <p v-if="it.data_votacao || it.legislatura" class="digest-item__line">
                <template v-if="it.data_votacao">
                  Votação AR: <strong>{{ formatDate(it.data_votacao) }}</strong>
                </template>
                <template v-if="it.legislatura">
                  <template v-if="it.data_votacao"> · </template>
                  Legislatura {{ it.legislatura }}
                </template>
              </p>

              <p v-if="autoresText(it)" class="digest-item__line">
                Autores: {{ autoresText(it) }}
              </p>

              <p v-if="it.descricao_oficial" class="digest-item__body">
                {{ it.descricao_oficial }}
              </p>
              <p v-else-if="it.explicacao" class="digest-item__body">
                {{ it.explicacao }}
              </p>

              <div class="digest-item__block">
                <h4 class="digest-item__h">Voto dos partidos na AR</h4>
                <div v-if="partyEntries(it).length" class="party-list">
                  <PartyVoteBadge
                    v-for="row in partyEntries(it)"
                    :key="row.id"
                    :partido="row.partido"
                    :voto="row.voto"
                  />
                </div>
                <p v-else class="muted sm">Sem registo de votos por partido neste item.</p>
              </div>

              <div class="digest-item__block">
                <h4 class="digest-item__h">Voto dos cidadãos (A Voto)</h4>
                <VoteBar :votos="cidadaosVotos(it)" />
              </div>

              <div v-if="linksOf(it).length" class="digest-item__links">
                <a
                  v-for="l in linksOf(it)"
                  :key="(l.url || '') + (l.label || '')"
                  :href="l.url"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {{ l.label || l.url }} ↗
                </a>
              </div>

              <router-link
                v-if="it.iniciativa_id"
                :to="`/iniciativas/${it.iniciativa_id}`"
                class="btn btn--ghost btn--sm digest-item__more"
              >
                Ver iniciativa completa
              </router-link>
            </div>
          </div>

          <div v-if="d.source_urls?.length" class="digest__sources">
            <span class="digest__sources-label">Fontes</span>
            <a
              v-for="s in d.source_urls"
              :key="s.url"
              :href="s.url"
              target="_blank"
              rel="noopener noreferrer"
            >
              {{ s.label || s.url }} ↗
            </a>
          </div>
        </div>
      </article>
    </div>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import PartyVoteBadge from '@/components/PartyVoteBadge.vue'
import VoteBar from '@/components/VoteBar.vue'
import { estadosLabel, formatDate, getPartido, partidos } from '@/data/partidos'
import { useFinanceStore } from '@/stores/finance'

const finance = useFinanceStore()

function estadoLabel(estado) {
  return estadosLabel[estado] || estado || '—'
}

function estadoBadge(estado) {
  if (estado === 'aprovado') return 'badge--green'
  if (estado === 'rejeitado') return 'badge--red'
  return 'badge--muted'
}

function autoresText(it) {
  const a = it?.autores
  if (!a) return ''
  if (Array.isArray(a)) return a.filter(Boolean).join(', ')
  return String(a)
}

function cidadaosVotos(it) {
  const v = it?.votos_cidadaos || {}
  return {
    favor: Number(v.favor || 0),
    contra: Number(v.contra || 0),
    abstencao: Number(v.abstencao || 0),
  }
}

/** Partidos conhecidos primeiro; depois quaisquer chaves extra no JSON */
function partyEntries(it) {
  const map = it?.resultado_partidos || {}
  if (!map || typeof map !== 'object') return []
  const known = new Set(partidos.map((p) => p.id))
  const rows = partidos
    .filter((p) => map[p.id] != null && map[p.id] !== '')
    .map((p) => ({ id: p.id, partido: p, voto: map[p.id] }))
  for (const [id, voto] of Object.entries(map)) {
    if (known.has(id)) continue
    if (voto == null || voto === '') continue
    rows.push({
      id,
      partido: getPartido(id) || { id, sigla: id.toUpperCase(), cor: '#999' },
      voto,
    })
  }
  return rows
}

function linksOf(it) {
  const links = it?.links
  if (!Array.isArray(links)) return []
  return links.filter((l) => l && l.url)
}

onMounted(() => {
  finance.loadDigests().catch(console.error)
})
</script>

<style scoped lang="scss">
.muted {
  color: var(--pt-muted);
  font-weight: 600;
  &.sm {
    font-size: 0.85rem;
    font-weight: 500;
  }
}
.digest-list {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}
.digest__head {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem 1rem;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 0.5rem;
}
.digest__title {
  font-family: var(--font-display);
  font-size: 1.25rem;
  margin: 0;
  color: var(--pt-navy);
}
.digest__summary {
  margin: 0 0 0.35rem;
  color: var(--pt-ink);
  line-height: 1.45;
}
.digest__meta {
  margin: 0 0 1rem;
  font-size: 0.82rem;
  color: var(--pt-muted);
}
.digest__items {
  display: flex;
  flex-direction: column;
  gap: 1.15rem;
  border-top: 1px solid var(--pt-line);
  padding-top: 1rem;
}
.digest-item {
  padding: 0.85rem 0 0;
  border-top: 1px dashed var(--pt-line);
  &:first-child {
    border-top: none;
    padding-top: 0;
  }
}
.digest-item__badges {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  align-items: center;
  margin-bottom: 0.4rem;
}
.digest-item__id {
  font-family: var(--font-mono);
  font-size: 0.85rem;
  font-weight: 700;
  text-decoration: none;
  color: var(--pt-green-dark);
}
.digest-item__titulo {
  margin: 0.15rem 0 0.4rem;
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--pt-navy);
  line-height: 1.3;
}
.digest-item__line {
  margin: 0 0 0.35rem;
  font-size: 0.88rem;
  color: var(--pt-muted);
}
.digest-item__body {
  margin: 0.5rem 0 0.75rem;
  font-size: 0.95rem;
  line-height: 1.5;
  color: var(--pt-ink);
}
.digest-item__block {
  margin: 0.75rem 0;
}
.digest-item__h {
  margin: 0 0 0.45rem;
  font-size: 0.8rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: var(--pt-muted);
}
.party-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}
.digest-item__links {
  display: flex;
  flex-wrap: wrap;
  gap: 0.65rem;
  margin: 0.5rem 0;
  a {
    font-size: 0.85rem;
    font-weight: 700;
  }
}
.digest-item__more {
  margin-top: 0.35rem;
}
.digest__sources {
  margin-top: 1.15rem;
  padding-top: 0.85rem;
  border-top: 1px solid var(--pt-line);
  display: flex;
  flex-wrap: wrap;
  gap: 0.65rem;
  align-items: center;
  a {
    font-size: 0.85rem;
    font-weight: 700;
  }
}
.digest__sources-label {
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--pt-muted);
  text-transform: uppercase;
  letter-spacing: 0.03em;
}
</style>
