<template>
  <section v-if="rows.length" class="rel-block">
    <h2 class="section-title">Na Assembleia da República</h2>
    <p class="hint">
      Iniciativas da AR relacionadas com este texto. As <strong>sugestões automáticas</strong>
      resultam da semelhança de títulos e datas e ainda não foram confirmadas por uma pessoa.
    </p>
    <ul class="rel-list">
      <li v-for="r in rows" :key="r.iniciativa_id" class="rel-item">
        <div class="rel-meta">
          <span class="badge" :class="r.confirmado ? 'badge--green' : 'badge--muted'">
            {{ r.confirmado ? 'Ligação confirmada' : 'Sugestão automática' }}
          </span>
          <span class="badge badge--gold">{{ r.iniciativas?.id_oficial }}</span>
          <span class="badge badge--navy">{{ r.iniciativas?.tipo }}</span>
          <span class="badge badge--muted">{{ estadosLabel[r.iniciativas?.estado] || r.iniciativas?.estado }}</span>
        </div>
        <router-link class="rel-title" :to="`/iniciativas/${r.iniciativa_id}`">
          {{ r.iniciativas?.titulo }}
        </router-link>
        <span class="rel-dates">
          Entrada {{ formatDate(r.iniciativas?.data_entrada) }}
          <template v-if="r.iniciativas?.data_votacao">
            · Votação {{ formatDate(r.iniciativas.data_votacao) }}
          </template>
        </span>
      </li>
    </ul>
  </section>
</template>

<script setup>
import { ref, watch } from 'vue'
import { supabase } from '@/lib/supabase'
import { estadosLabel, formatDate } from '@/data/partidos'

const props = defineProps({
  comunicadoId: { type: String, required: true },
})

const rows = ref([])

async function load(id) {
  rows.value = []
  if (!id) return
  const { data, error } = await supabase
    .from('comunicado_iniciativa')
    .select(
      'iniciativa_id, score, confirmado, iniciativas!inner(id_oficial, titulo, tipo, estado, data_entrada, data_votacao)',
    )
    .eq('comunicado_id', id)
    .order('confirmado', { ascending: false, nullsFirst: false })
    .order('score', { ascending: false })
    .limit(8)
  if (error) {
    console.error(error)
    return
  }
  rows.value = data || []
}

watch(() => props.comunicadoId, load, { immediate: true })
</script>

<style scoped lang="scss">
.rel-block {
  margin-top: 1.25rem;
  padding-top: 1rem;
  border-top: 1px solid var(--pt-line);
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
  gap: 0.8rem;
}
.rel-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  margin-bottom: 0.3rem;
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
.rel-dates {
  font-size: 0.82rem;
  color: var(--pt-muted);
}
</style>
