<template>
  <div v-if="data.loadingDetail && !item" class="page-shell">
    <p class="muted">A carregar iniciativa…</p>
  </div>
  <div class="page-shell" v-else-if="item">
    <router-link to="/iniciativas" class="back-link">← Voltar às iniciativas</router-link>

    <div class="av-card detail-hero">
      <div class="flag-stripe" aria-hidden="true">
        <span class="flag-stripe__green" />
        <span class="flag-stripe__red" />
      </div>
      <div class="av-card-pad">
        <div class="meta-row">
          <span class="badge" :class="estadoClass">{{ estadosLabel[item.estado] }}</span>
          <span class="badge badge--navy">{{ item.tipo }}</span>
          <span class="badge badge--muted">{{ item.tema }}</span>
          <span class="badge badge--gold">{{ item.idOficial }}</span>
        </div>
        <h1 class="page-title" style="margin-top: 0.75rem">{{ item.titulo }}</h1>
        <p class="page-subtitle" style="margin-bottom: 0.5rem">
          Legislatura {{ item.legislatura }} · Entrada {{ formatDate(item.dataEntrada) }}
          <template v-if="item.dataVotacao">
            · Votação AR {{ formatDate(item.dataVotacao) }}
          </template>
        </p>
        <p class="authors">
          <strong>Autores / proponentes:</strong>
          {{ item.autores.join(', ') || '—' }}
        </p>
        <p v-if="item.autoresDeputados.length" class="authors authors--deps">
          <strong>Deputados:</strong>
          <span v-for="(d, i) in deputadosVisiveis" :key="d.nome + i" class="dep">
            {{ d.nome }}<template v-if="d.gp"> ({{ d.gp }})</template><template v-if="i < deputadosVisiveis.length - 1">, </template>
          </span>
          <button
            v-if="item.autoresDeputados.length > deputadosVisiveis.length"
            type="button"
            class="link-btn"
            @click="todosDeputados = true"
          >
            + {{ item.autoresDeputados.length - deputadosVisiveis.length }}
          </button>
        </p>
        <p v-if="item.comissao" class="authors">
          <strong>Comissão competente:</strong> {{ item.comissao.nome }}
          <template v-if="item.comissao.relatores?.length">
            · Relator{{ item.comissao.relatores.length > 1 ? 'es' : '' }}:
            {{ item.comissao.relatores.map((r) => r.nome + (r.gp ? ` (${r.gp})` : '')).join(', ') }}
          </template>
        </p>
        <p class="tema-fonte">{{ temaFonteTexto }}</p>
      </div>
    </div>

    <div class="detail-grid">
      <section class="av-card">
        <div class="av-card-pad stack">
          <h2 class="section-title">Descrição oficial</h2>
          <p class="body-text">{{ item.descricaoOficial }}</p>
          <h2 class="section-title">O que está em causa</h2>
          <p class="body-text">{{ item.explicacao }}</p>
          <h2 class="section-title">Ligações oficiais</h2>
          <ul class="links">
            <li v-for="l in item.links" :key="l.url + l.label">
              <a :href="l.url" target="_blank" rel="noopener noreferrer">{{ l.label }} ↗</a>
            </li>
          </ul>
        </div>
      </section>

      <section class="stack">
        <div class="av-card">
          <div class="av-card-pad">
            <h2 class="section-title">Voto dos cidadãos</h2>
            <VoteBar :votos="item.votosCidadaos" />
            <div class="vote-actions">
              <template v-if="meuVoto">
                <div class="vote-locked">
                  <span class="badge badge--green">O seu voto está registado</span>
                  <p class="vote-locked__text">
                    Votou <strong>{{ votoLabel[meuVoto] }}</strong>.
                    <span class="vote-locked__warn">Não pode ser alterado.</span>
                  </p>
                </div>
              </template>
              <template v-else-if="!auth.isLoggedIn">
                <p class="hint">Entre para votar. Um voto por conta — definitivo após confirmação.</p>
                <router-link
                  class="btn btn--primary btn--sm"
                  :to="{ name: 'entrar', query: { redirect: route.fullPath } }"
                >
                  Entrar para votar
                </router-link>
              </template>
              <template v-else>
                <p class="hint">
                  Escolha o sentido. Será pedida <strong>confirmação</strong>; depois
                  <strong>não poderá alterar</strong>.
                </p>
                <div class="vote-btns">
                  <button type="button" class="btn btn--primary btn--sm" @click="pedirConfirmacao('favor')">
                    A favor
                  </button>
                  <button type="button" class="btn btn--secondary btn--sm" @click="pedirConfirmacao('contra')">
                    Contra
                  </button>
                  <button type="button" class="btn btn--outline btn--sm" @click="pedirConfirmacao('abstencao')">
                    Abstenção
                  </button>
                </div>
              </template>
            </div>
          </div>
        </div>

        <div class="av-card">
          <div class="av-card-pad">
            <h2 class="section-title">Voto dos partidos na AR</h2>
            <p class="hint" style="margin-bottom: 0.75rem">
              Sentido de voto do grupo parlamentar. Lista em
              <strong>ordem alfabética por sigla</strong> (anti-enviesamento). O número a seguir à
              sigla é a <strong>bancada</strong> (deputados) — peso no hemiciclo, não “quanto deve
              o cidadão votar”. Ver
              <router-link to="/como-funciona">Como funciona</router-link>.
            </p>
            <p v-if="item.votacaoPrincipal" class="vote-phase">
              {{ item.votacaoPrincipal.fase }} · {{ formatDate(item.votacaoPrincipal.data) }}
              <template v-if="item.votacaoPrincipal.resultado"> · {{ item.votacaoPrincipal.resultado }}</template>
            </p>
            <p v-if="!hasPartidos" class="hint">
              O registo oficial desta iniciativa ainda não tem detalhe de voto por grupo
              parlamentar (ou a votação não ocorreu). Sem inventar dados.
            </p>
            <div v-else class="party-list">
              <PartyVoteBadge
                v-for="p in partidosComVoto"
                :key="p.id"
                :partido="p"
                :voto="item.resultadoPartidos[p.id]"
                :assentos="assentosDe(p.id)"
              />
            </div>
          </div>
        </div>
      </section>
    </div>


    <!-- Percurso na AR -->
    <section v-if="item.fases.length" class="av-card" style="margin-top: 1rem" aria-labelledby="percurso-h">
      <div class="av-card-pad">
        <div class="section-head">
          <h2 id="percurso-h" class="section-title">Percurso na Assembleia da República</h2>
          <button v-if="fasesChave.length < item.fases.length" type="button" class="link-btn" @click="todasFases = !todasFases">
            {{ todasFases ? 'Mostrar só as fases principais' : `Ver percurso completo (${item.fases.length} fases)` }}
          </button>
        </div>
        <ol class="timeline">
          <li
            v-for="(f, i) in fasesVisiveis"
            :key="i + f.fase + f.data"
            class="timeline__item"
            :class="faseClasse(f.fase)"
          >
            <span class="timeline__date">{{ formatDate(f.data) }}</span>
            <span class="timeline__label">{{ f.fase }}</span>
            <span v-if="f.obs" class="timeline__obs">{{ f.obs }}</span>
            <a v-if="f.dar?.url" :href="f.dar.url" target="_blank" rel="noopener noreferrer" class="timeline__link">
              {{ f.dar.tipo || 'Diário da AR' }}<template v-if="f.dar.numero"> n.º {{ f.dar.numero }}</template> ↗
            </a>
          </li>
        </ol>
      </div>
    </section>

    <!-- Votações por fase -->
    <section v-if="item.votacoes.length" class="av-card" style="margin-top: 1rem" aria-labelledby="votacoes-h">
      <div class="av-card-pad">
        <h2 id="votacoes-h" class="section-title">Votações em plenário ({{ item.votacoes.length }})</h2>
        <p class="hint">
          Todas as votações registadas nos Dados Abertos da AR. O estado da iniciativa só conta a
          votação final (ou a publicação em Diário da República); requerimentos não contam.
        </p>
        <div class="votacoes">
          <article
            v-for="v in item.votacoes"
            :key="v.id || v.fase + v.data"
            class="votacao"
            :class="{ 'votacao--principal': v.id && v.id === item.votacaoPrincipal?.id }"
          >
            <header class="votacao__head">
              <span class="votacao__date">{{ formatDate(v.data) }}</span>
              <strong>{{ v.fase }}</strong>
              <span class="badge" :class="resultadoClasse(v.resultado)">{{ v.resultado || 'Sem resultado' }}</span>
              <span v-if="v.unanime" class="badge badge--muted">Unanimidade</span>
              <span v-if="v.tipo === 'procedimento'" class="badge badge--muted">Requerimento / procedimento</span>
              <span v-if="v.id && v.id === item.votacaoPrincipal?.id" class="badge badge--navy">Define o estado</span>
            </header>
            <p v-if="v.descricao" class="votacao__desc">{{ v.descricao }}</p>
            <div v-if="Object.keys(v.partidos || {}).length" class="votacao__parties">
              <span
                v-for="row in partyRows(v)"
                :key="row.id"
                class="pv"
                :class="`pv--${row.voto}`"
                :title="`${row.nome}: ${votoLabel[row.voto]}`"
              >
                <i class="pv__dot" :style="{ background: row.cor }" />
                {{ row.sigla }}<template v-if="v.deputados?.[row.id]"> · {{ v.deputados[row.id] }}</template>
              </span>
            </div>
            <p v-if="v.ausencias?.length" class="votacao__aus">
              Ausentes: {{ v.ausencias.map(siglaDe).join(', ') }}
            </p>
          </article>
        </div>
      </div>
    </section>

    <!-- Debate -->
    <section v-if="item.debates.length" class="av-card" style="margin-top: 1rem" aria-labelledby="debate-h">
      <div class="av-card-pad">
        <h2 id="debate-h" class="section-title">Debate em plenário</h2>
        <div v-for="(d, i) in item.debates" :key="i" class="debate">
          <p class="debate__head">
            <strong>{{ formatDate(d.data) }}</strong> · {{ d.fase }}
            <a v-if="d.video" :href="d.video" target="_blank" rel="noopener noreferrer" class="btn btn--primary btn--sm">
              ▶ Vídeo do debate
            </a>
            <a v-if="d.dar" :href="d.dar" target="_blank" rel="noopener noreferrer" class="btn btn--outline btn--sm">
              Diário da AR ↗
            </a>
          </p>
          <ul v-if="d.intervencoes.length" class="oradores">
            <li v-for="(o, j) in d.intervencoes.filter((x) => x.nome)" :key="j">
              <a v-if="o.video" :href="o.video" target="_blank" rel="noopener noreferrer">{{ o.nome }}</a>
              <template v-else>{{ o.nome }}</template>
              <span class="oradores__gp">{{ o.gp || o.cargo }}</span>
            </li>
          </ul>
        </div>
      </div>
    </section>

    <div class="detail-grid detail-grid--even">
      <!-- Documentos -->
      <section v-if="item.documentos.length" class="av-card" aria-labelledby="docs-h">
        <div class="av-card-pad">
          <div class="section-head">
            <h2 id="docs-h" class="section-title">Documentos ({{ item.documentos.length }})</h2>
            <button v-if="item.documentos.length > 10" type="button" class="link-btn" @click="todosDocs = !todosDocs">
              {{ todosDocs ? 'Mostrar menos' : 'Ver todos' }}
            </button>
          </div>
          <ul class="docs">
            <li v-for="d in docsVisiveis" :key="d.url">
              <a :href="d.url" target="_blank" rel="noopener noreferrer">{{ d.titulo }} ↗</a>
              <span class="docs__meta">
                {{ d.tipo }}<template v-if="d.data"> · {{ formatDate(d.data) }}</template><template v-if="d.fase"> · {{ d.fase }}</template>
              </span>
            </li>
          </ul>
          <template v-if="item.comissao?.pareceres_recebidos?.length">
            <h3 class="sub-title">Pareceres recebidos pela comissão</h3>
            <ul class="docs docs--plain">
              <li v-for="p in item.comissao.pareceres_recebidos" :key="p">{{ p }}</li>
            </ul>
          </template>
        </div>
      </section>

      <!-- Dossiê -->
      <section v-if="mesmoDossie.length || item.conjuntas.length" class="av-card" aria-labelledby="dossie-h">
        <div class="av-card-pad">
          <h2 id="dossie-h" class="section-title">Mesmo dossiê</h2>
          <p class="hint">Iniciativas discutidas em conjunto na AR ou com o mesmo título.</p>
          <ul class="docs">
            <li v-for="d in mesmoDossie" :key="d.id">
              <router-link :to="`/iniciativas/${d.id}`">{{ d.idOficial }} — {{ d.titulo }}</router-link>
              <span class="docs__meta">
                {{ estadosLabel[d.estado] }}<template v-if="d.autores?.length"> · {{ d.autores.join(', ') }}</template>
              </span>
            </li>
          </ul>
        </div>
      </section>
    </div>

    <section v-if="hasPartidos" class="av-card" style="margin-top: 1rem">
      <div class="av-card-pad">
        <PartyWeightPanel
          :resultado-partidos="item.resultadoPartidos"
          :legislatura="item.legislatura"
          :estado="item.estado"
        />
      </div>
    </section>

    <section class="av-card" style="margin-top: 1rem">
      <div class="av-card-pad">
        <h2 class="section-title">Alinhamento cidadãos ↔ partidos</h2>
        <p class="hint" style="margin: -0.35rem 0 0.85rem">
          Com votos de cidadãos: ordenado por % de alinhamento (métrica). Sem votos ou em empate:
          <strong>ordem alfabética por sigla</strong>.
        </p>
        <div class="av-table-wrap">
          <table class="av-table">
            <thead>
              <tr>
                <th>Partido</th>
                <th>Voto AR</th>
                <th>Alinhamento</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in alinhamentos" :key="row.id">
                <td>
                  <span class="party-cell">
                    <span class="party-dot" :style="{ background: row.cor }" />
                    {{ row.sigla }}
                  </span>
                </td>
                <td>{{ votoLabel[row.voto] }}</td>
                <td>
                  <template v-if="row.alinhamento == null">—</template>
                  <template v-else>{{ row.alinhamento }}%</template>
                </td>
                <td style="min-width: 140px">
                  <div v-if="row.alinhamento != null" class="mini-bar">
                    <div class="mini-bar__fill" :style="{ width: row.alinhamento + '%' }" />
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>
    <ComunicadosRelacionados :iniciativa-id="item.id" />
  </div>

  <div v-else class="page-shell">
    <h1 class="page-title">Iniciativa não encontrada</h1>
    <router-link to="/iniciativas" class="btn btn--primary">Voltar às iniciativas</router-link>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useQuasar } from 'quasar'
import VoteBar from '@/components/VoteBar.vue'
import PartyVoteBadge from '@/components/PartyVoteBadge.vue'
import PartyWeightPanel from '@/components/PartyWeightPanel.vue'
import ComunicadosRelacionados from '@/components/ComunicadosRelacionados.vue'
import { assentosPartido } from '@/data/composicaoAr'
import {
  partidos,
  estadosLabel,
  estadoBadgeClass,
  votoLabel,
  formatDate,
  alinhamentoCidadaosPartido,
  getPartido,
} from '@/data/partidos'
import { useAuthStore } from '@/stores/auth'
import { useDataStore } from '@/stores/data'

const route = useRoute()
const $q = useQuasar()
const auth = useAuthStore()
const data = useDataStore()

const meuVoto = ref(null)
const resolved = ref(null)

const todasFases = ref(false)
const todosDocs = ref(false)
const todosDeputados = ref(false)

// Preferir a versão com ficha completa (a lista só tem colunas leves)
const item = computed(() => {
  const fromList = data.getIniciativa(route.params.id)
  if (fromList?.detalheCarregado) return fromList
  if (resolved.value?.id === route.params.id) return resolved.value
  return fromList || null
})

const deputadosVisiveis = computed(() =>
  todosDeputados.value ? item.value.autoresDeputados : item.value.autoresDeputados.slice(0, 6),
)

const temaFonteTexto = computed(() => {
  const f = item.value?.temaFonte
  if (f === 'comissao') return `Tema “${item.value.tema}” atribuído pela comissão competente da AR.`
  if (f === 'palavras_chave' || f === 'palavras_chave_legado') return `Tema “${item.value.tema}” deduzido do título (sem comissão competente indicada pela AR).`
  if (f === 'procedimento') return 'Procedimento interno da Assembleia da República.'
  return ''
})

const FASE_CHAVE = /^(entrada|admiss|baixa comiss|discuss|vota|confirma|envio para promulga|promulga|veto \(publica|lei \(publica|resolu|delibera|decreto \(publica|retirada|n[aã]o admiss|reaprecia)/i
const fasesChave = computed(() => (item.value?.fases || []).filter((f) => FASE_CHAVE.test(f.fase)))
const fasesVisiveis = computed(() => (todasFases.value ? item.value.fases : fasesChave.value))

function faseClasse(fase) {
  const f = String(fase || '').toLowerCase()
  if (f.startsWith('vota') || f.startsWith('confirma')) return 'timeline__item--vote'
  if (f.startsWith('lei (') || f.startsWith('resolução da ar (')) return 'timeline__item--done'
  if (f.startsWith('veto') || f.startsWith('retirada')) return 'timeline__item--warn'
  return ''
}

function resultadoClasse(r) {
  const s = String(r || '').toLowerCase()
  if (s.includes('aprov')) return 'badge--green'
  if (s.includes('rejeit')) return 'badge--red'
  return 'badge--muted'
}

function partyRows(v) {
  const map = v.partidos || {}
  return partidos
    .filter((p) => map[p.id])
    .map((p) => ({ id: p.id, sigla: p.sigla, nome: p.nome, cor: p.cor, voto: map[p.id] }))
}

function siglaDe(id) {
  return getPartido(id)?.sigla || id
}

const docsVisiveis = computed(() => (todosDocs.value ? item.value.documentos : item.value.documentos.slice(0, 10)))

const mesmoDossie = computed(() => {
  if (!item.value) return []
  const fromStore = data.dossieDe(item.value)
  const ids = new Set(fromStore.map((i) => i.id))
  const extra = (item.value.conjuntas || [])
    .filter((c) => !ids.has(c.iniciativa_id))
    .map((c) => {
      const known = data.getIniciativa(c.iniciativa_id)
      return known || { id: c.iniciativa_id, idOficial: c.id_oficial, titulo: c.titulo, estado: null, autores: c.autor ? [c.autor] : [] }
    })
  return [...fromStore, ...extra]
})

watch(
  () => route.params.id,
  async (id) => {
    resolved.value = null
    if (!id) return
    try {
      resolved.value = await data.ensureIniciativa(id)
    } catch (e) {
      console.error(e)
      resolved.value = null
    }
  },
  { immediate: true },
)

watch(
  () => [route.params.id, auth.isLoggedIn, auth.user?.id, item.value?.id],
  async () => {
    meuVoto.value = null
    if (auth.isLoggedIn && route.params.id && item.value) {
      try {
        meuVoto.value = await auth.getVoto(route.params.id)
      } catch (e) {
        console.error(e)
      }
    }
  },
  { immediate: true },
)

const estadoClass = computed(() => estadoBadgeClass(item.value?.estado))

const hasPartidos = computed(() => {
  const m = item.value?.resultadoPartidos
  if (!m) return false
  return Object.values(m).some((v) => v && v !== 'nao_participou')
})

const partidosComVoto = computed(() => {
  if (!item.value) return []
  const m = item.value.resultadoPartidos || {}
  // partidos[] já é alfabético por sigla — só filtramos quem votou
  return partidos.filter((p) => m[p.id] && m[p.id] !== 'nao_participou')
})

function assentosDe(partidoId) {
  return assentosPartido(partidoId, item.value?.legislatura)
}

const alinhamentos = computed(() => {
  if (!item.value || !hasPartidos.value) return []
  return partidosComVoto.value
    .map((p) => ({
      id: p.id,
      sigla: p.sigla,
      cor: p.cor,
      voto: item.value.resultadoPartidos[p.id],
      alinhamento: alinhamentoCidadaosPartido(item.value, p.id),
    }))
    // Com cidadãos a votar: ordenar por % alinhamento; senão / empate → alfabético
    .sort((a, b) => {
      const aa = a.alinhamento
      const bb = b.alinhamento
      if (aa == null && bb == null) {
        return a.sigla.localeCompare(b.sigla, 'pt', { sensitivity: 'base' })
      }
      if (aa == null) return 1
      if (bb == null) return -1
      if (bb !== aa) return bb - aa
      return a.sigla.localeCompare(b.sigla, 'pt', { sensitivity: 'base' })
    })
})

function pedirConfirmacao(voto) {
  if (!item.value) return
  const label = votoLabel[voto]
  $q.dialog({
    title: 'Confirmar voto',
    message:
      `Vai registar o voto <strong>${label}</strong> nesta iniciativa.<br><br>` +
      `<strong>Atenção:</strong> depois de confirmar fica definitivo e ` +
      `<strong>não pode ser alterado</strong>.`,
    html: true,
    persistent: true,
    ok: {
      label: `Confirmar: ${label}`,
      color: voto === 'contra' ? 'secondary' : 'primary',
      unelevated: true,
    },
    cancel: { label: 'Cancelar', flat: true, color: 'grey-8' },
  }).onOk(() => confirmarVoto(voto))
}

async function confirmarVoto(voto) {
  if (!item.value) return
  try {
    await auth.castVoto(item.value.id, voto)
    meuVoto.value = voto
    await data.refreshAgg(item.value.id)
    $q.notify({
      type: 'positive',
      message: `Voto registado: ${votoLabel[voto]}. Não pode ser alterado.`,
      position: 'top',
    })
  } catch (e) {
    const code = e.code || e.message
    if (code === 'ALREADY_VOTED' || String(e.message).includes('ALREADY_VOTED')) {
      meuVoto.value = await auth.getVoto(item.value.id)
      $q.notify({
        type: 'warning',
        message: 'Já votou nesta iniciativa. O voto não pode ser alterado.',
        position: 'top',
      })
      return
    }
    if (code === 'RATE_LIMITED' || String(e.message).includes('RATE_LIMITED')) {
      $q.notify({
        type: 'warning',
        message: 'Demasiados pedidos. Espere um minuto e tente de novo.',
        position: 'top',
      })
      return
    }
    $q.notify({
      type: 'negative',
      message: e.message || 'Não foi possível registar o voto.',
      position: 'top',
    })
  }
}
</script>

<style scoped lang="scss">
.muted {
  color: var(--pt-muted);
  font-weight: 600;
}
.back-link {
  display: inline-block;
  font-weight: 700;
  font-size: 0.9rem;
  text-decoration: none;
  color: var(--pt-green-dark);
  margin-bottom: 1rem;
  &:hover {
    color: var(--pt-red);
  }
}
.meta-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}
.authors {
  margin: 0.75rem 0 0;
  font-size: 0.95rem;
  color: var(--pt-muted);
}
.authors--deps {
  margin-top: 0.35rem;
  font-size: 0.88rem;
}
.tema-fonte {
  margin: 0.5rem 0 0;
  font-size: 0.8rem;
  color: var(--pt-muted);
  font-style: italic;
}
.link-btn {
  border: none;
  background: none;
  padding: 0;
  font: inherit;
  font-weight: 700;
  font-size: 0.85rem;
  color: var(--pt-green-dark);
  cursor: pointer;
  text-decoration: underline;
}
.section-head {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.5rem;
}
.sub-title {
  font-size: 0.95rem;
  margin: 1rem 0 0.4rem;
  color: var(--pt-navy);
}
.vote-phase {
  margin: 0 0 0.6rem;
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--pt-navy);
}
.timeline {
  list-style: none;
  margin: 0.5rem 0 0;
  padding: 0 0 0 1rem;
  border-left: 2px solid var(--pt-border);
}
.timeline__item {
  position: relative;
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem 0.75rem;
  padding: 0.35rem 0 0.55rem;
  &::before {
    content: '';
    position: absolute;
    left: calc(-1rem - 6px);
    top: 0.65rem;
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: #fff;
    border: 2px solid var(--pt-border);
  }
  &--vote::before {
    border-color: var(--pt-gold);
    background: #fbf3d5;
  }
  &--done::before {
    border-color: var(--pt-green);
    background: var(--pt-green);
  }
  &--warn::before {
    border-color: var(--pt-red);
    background: #fdeceb;
  }
}
.timeline__date {
  font-family: var(--font-mono);
  font-size: 0.82rem;
  color: var(--pt-muted);
  min-width: 6.2rem;
}
.timeline__label {
  font-weight: 700;
  color: var(--pt-navy);
}
.timeline__obs {
  flex-basis: 100%;
  margin-left: 7rem;
  font-size: 0.82rem;
  color: var(--pt-muted);
}
.timeline__link {
  font-size: 0.82rem;
  font-weight: 600;
  text-decoration: none;
}
.votacoes {
  display: grid;
  gap: 0.75rem;
}
.votacao {
  border: 1px solid var(--pt-border);
  border-radius: 10px;
  padding: 0.7rem 0.85rem;
  &--principal {
    border-color: var(--pt-navy);
    box-shadow: inset 3px 0 0 var(--pt-navy);
  }
}
.votacao__head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.4rem 0.6rem;
}
.votacao__date {
  font-family: var(--font-mono);
  font-size: 0.82rem;
  color: var(--pt-muted);
}
.votacao__desc {
  margin: 0.45rem 0 0;
  font-size: 0.85rem;
  color: var(--pt-muted);
}
.votacao__parties {
  display: flex;
  flex-wrap: wrap;
  gap: 0.3rem;
  margin-top: 0.55rem;
}
.votacao__aus {
  margin: 0.4rem 0 0;
  font-size: 0.8rem;
  color: var(--pt-muted);
}
.pv {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.72rem;
  font-weight: 800;
  padding: 0.2rem 0.42rem;
  border-radius: 2px;
  border: 1.5px solid var(--pt-border);
  border-left-width: 3px;
  color: var(--pt-navy);
  &__dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
  }
  &--favor {
    background: #e8f5ee;
    border-color: #7abf96;
    border-left-color: var(--pt-green);
    color: var(--pt-green-dark);
  }
  &--contra {
    background: #fdeceb;
    border-color: #e8a0a8;
    border-left-color: var(--pt-red);
    color: var(--pt-red-dark);
  }
  &--abstencao {
    background: #fbf3d5;
    border-color: #e0c86a;
    border-left-color: #b8860b;
    color: #6b5500;
  }
}
.debate + .debate {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid var(--pt-border);
}
.debate__head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
  margin: 0 0 0.6rem;
}
.oradores {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  list-style: none;
  margin: 0;
  padding: 0;
  li {
    font-size: 0.82rem;
    border: 1px solid var(--pt-border);
    border-radius: 99px;
    padding: 0.15rem 0.6rem;
    background: var(--pt-cream);
  }
  a {
    font-weight: 600;
    text-decoration: none;
  }
  &__gp {
    margin-left: 0.3rem;
    font-weight: 800;
    font-size: 0.72rem;
    color: var(--pt-muted);
  }
}
.docs {
  margin: 0.5rem 0 0;
  padding-left: 1.1rem;
  li {
    margin-bottom: 0.4rem;
  }
  a {
    font-weight: 600;
    text-decoration: none;
  }
  &__meta {
    display: block;
    font-size: 0.78rem;
    color: var(--pt-muted);
  }
  &--plain li {
    font-size: 0.85rem;
  }
}
.detail-grid--even {
  @media (min-width: 960px) {
    grid-template-columns: 1fr 1fr;
  }
}
.detail-grid {
  display: grid;
  gap: 1rem;
  margin-top: 1rem;
  @media (min-width: 960px) {
    grid-template-columns: 1.2fr 1fr;
    align-items: start;
  }
}
.body-text {
  margin: 0;
  line-height: 1.6;
}
.links {
  margin: 0;
  padding-left: 1.1rem;
  a {
    font-weight: 600;
    text-decoration: none;
  }
}
.vote-actions {
  margin-top: 1.1rem;
  padding-top: 1rem;
  border-top: 1px solid var(--pt-border);
}
.vote-btns {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin: 0.75rem 0 0;
}
.vote-locked {
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
}
.vote-locked__text {
  margin: 0;
  font-size: 0.95rem;
}
.vote-locked__warn {
  display: block;
  margin-top: 0.25rem;
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--pt-red-dark);
}
.hint {
  margin: 0 0 0.65rem;
  font-size: 0.85rem;
  color: var(--pt-muted);
}
.party-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}
.party-cell {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  font-weight: 700;
}
.mini-bar {
  height: 8px;
  background: #f5f5f4;
  border-radius: 99px;
  overflow: hidden;
  border: 1px solid var(--pt-border);
  &__fill {
    height: 100%;
    background: linear-gradient(90deg, var(--pt-green), var(--pt-gold));
    border-radius: 99px;
  }
}
</style>
