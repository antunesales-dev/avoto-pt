// node --test scripts/ingest-portal-base.test.mjs
import assert from 'node:assert/strict'
import test from 'node:test'
import { isoDate, mapContrato, nifNome } from './ingest-portal-base.mjs'

test('datas e NIF', () => {
  assert.equal(isoDate('04/12/2025'), '2025-12-04')
  assert.equal(isoDate(''), null)
  assert.deepEqual(nifNome('510103448 - Unidade Local de Saúde de Coimbra, E.P.E.'), { nif: '510103448', nome: 'Unidade Local de Saúde de Coimbra, E.P.E.' })
  assert.deepEqual(nifNome('504615947 - 1 - MEO - SERVIÇOS'), { nif: '504615947', nome: '1 - MEO - SERVIÇOS' })
})

test('registo real do JSON 2026', () => {
  const c = mapContrato(
    {
      idcontrato: '12014814', idprocedimento: '8086378', tipoContrato: ['Aquisição de serviços'],
      tipoprocedimento: 'Ajuste Direto Regime Geral', objectoContrato: 'Selo de Usabilidade ',
      adjudicante: ['600052737 - Serviços de Ação Social do Instituto Politécnico de Coimbra'],
      adjudicatarios: ['515615021 - XpertGo - Business Solutions Development, Lda'],
      dataPublicacao: '04/12/2025', dataCelebracaoContrato: '23/02/2026', precoContratual: 9000.0,
      cpv: ['72210000-0 - Serviços de programação de pacotes de software'], prazoExecucao: 81,
      ProcedimentoCentralizado: 'Não', PrecoTotalEfetivo: 0.0, Ano: 2026,
    },
    'Contratos2026.json',
  )
  assert.equal(c.id, '12014814')
  assert.equal(c.adjudicante_nif, '600052737')
  assert.equal(c.data_celebracao, '2026-02-23')
  assert.equal(c.preco_total_efetivo, null)
  assert.equal(c.procedimento_centralizado, false)
  assert.deepEqual(c.cpv[0], { codigo: '72210000-0', descricao: 'Serviços de programação de pacotes de software' })
  assert.equal(c.objeto, 'Selo de Usabilidade')
})
