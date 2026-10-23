<template>
  <section v-if="rows.length" class="av-card rel-card">
    <div class="av-card-pad">
      <h2 class="section-title">O que o Governo disse</h2>
      <p class="hint">
        Comunicados e notícias do portugal.gov.pt ligados a esta iniciativa. As
        <strong>sugestões automáticas</strong> resultam da semelhança de títulos e datas e
        ainda não foram confirmadas por uma pessoa.
      </p>
      <ul class="rel-list">
        <li v-for="r in rows" :key="r.comunicado_id" class="rel-item">
          <div class="rel-meta">
            <span class="badge" :class="r.confirmado ? 'badge--green' : 'badge--muted'">
              {{ r.confirmado ? 'Ligação confirmada' : 'Sugestão automática' }}
            </span>
            <span class="badge badge--navy">{{ tipoLabel(r.comunicados?.tipo) }}</span>
            <span class="badge badge--muted">{{ formatDate(r.comunicados?.publicado_em) }}</span>
          </div>
          <router-link class="rel-title" :to="`/comunicados/${r.comunicado_id}`">
            {{ r.comunicados?.titulo }}
          </router-link>
          <a
            class="rel-src"
            :href="r.comunicados?.url_oficial"
            target="_blank"
            rel="noopener noreferrer"
          >
            Fonte: portugal.gov.pt ↗
          </a>
        </li>
      </ul>
    </div>
  </section>
</template>

<script setup>
import { ref, watch } from 'vue'
import { supabase } from '@/lib/supabase'
import { formatDate } from '@/data/partidos'

const props = defineProps({
  iniciativaId: { type: String, required: true },
})

const rows = ref([])

const TIPOS = {
  comunicado_cm: 'Conselho de Ministros',
  noticia: 'Notícia',
  intervencao: 'Intervenção',
  outro: 'Oficial',
}
function tipoLabel(t) {
  return TIPOS[t] || 'Oficial'
}

async function load(id) {
  rows.value = []
  if (!id) return
  // RLS só devolve ligações confirmadas ou sugestões de confiança alta
  const { data, error } = await supabase
    .from('comunicado_iniciativa')
    .select('comunicado_id, score, confirmado, comunicados!inner(titulo, publicado_em, tipo, url_oficial)')
    .eq('iniciativa_id', id)
    .order('confirmado', { ascending: false, nullsFirst: false })
    .order('score', { ascending: false })
    .limit(8)
  if (error) {
    console.error(error)
    return
  }
  rows.value = data || []
}

watch(() => props.iniciativaId, load, { immediate: true })
</script>

<style scoped lang="scss">
.rel-card {
  margin-top: 1rem;
}
.hint {
  margin: -0.35rem 0 0.85rem;
  font-size: 0.88rem;
  color: var(--pt-muted);
  line-height: 1.45;
}
.rel-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}
.rel-item {
  border-top: 1px solid var(--pt-line);
  padding-top: 0.75rem;
  &:first-child {
    border-top: none;
    padding-top: 0;
  }
}
.rel-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  margin-bottom: 0.35rem;
}
.rel-title {
  display: block;
  font-weight: 700;
  color: var(--pt-navy);
  text-decoration: none;
  line-height: 1.35;
  &:hover {
    text-decoration: underline;
  }
}
.rel-src {
  font-size: 0.82rem;
  color: var(--pt-muted);
}
</style>
