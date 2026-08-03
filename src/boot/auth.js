import { defineBoot } from '#q-app'
import { useAuthStore } from '@/stores/auth'
import { useDataStore } from '@/stores/data'

export default defineBoot(async () => {
  const auth = useAuthStore()
  const data = useDataStore()
  await Promise.all([auth.init(), data.loadAll().catch((e) => console.error(e))])
  data.startRealtime()
})
