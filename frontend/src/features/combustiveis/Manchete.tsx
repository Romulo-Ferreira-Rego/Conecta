import { motion } from 'motion/react'

import { useMeta, useResumo } from '../../api/hooks'
import { formatDate } from '../../lib/format'
import { productLabel } from '../../lib/lugares'
import { fadeUp } from '../../lib/motion'
import { Skeleton } from '../../components/ui/States'
import { buildDeck, buildHeadline } from './textosManchete'
import { useFiltros } from './useFiltros'
import { useLocalNome } from './useLocalNome'

/** Abertura da página no estilo de uma matéria: título e linha fina gerados dos dados. */
export function Manchete() {
  const { filtros, local } = useFiltros()
  const lugar = useLocalNome(local)
  const { data: resumo, isPending } = useResumo(local)
  const { data: meta } = useMeta()
  const item = resumo?.find((r) => r.produto === filtros.produto)

  return (
    <motion.div variants={fadeUp} className="max-w-4xl pt-10 pb-8 sm:pt-14 sm:pb-10">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="h-px w-6 bg-brand" aria-hidden="true" />
        <p className="eyebrow !text-brand-ink">Conecta Dados · Combustíveis</p>
        {meta?.ultima_importacao && (
          <p className="text-xs text-muted">Atualizado em {formatDate(meta.ultima_importacao)}</p>
        )}
      </div>

      {isPending ? (
        <div className="mt-5 space-y-3" aria-busy="true">
          <Skeleton className="h-10 w-4/5 sm:h-12" />
          <Skeleton className="h-5 w-3/5" />
        </div>
      ) : item ? (
        <>
          <h1 className="mt-5 text-[32px] leading-[1.08] font-semibold tracking-[-0.03em] text-balance text-ink sm:text-5xl">
            {buildHeadline(item, lugar)}
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-pretty text-ink-2 sm:text-lg">{buildDeck(item)}</p>
        </>
      ) : (
        <>
          <h1 className="mt-5 text-[32px] leading-[1.08] font-semibold tracking-[-0.03em] text-balance sm:text-5xl">
            Preços de combustíveis {lugar.frase}
          </h1>
          <p className="mt-4 text-base text-ink-2 sm:text-lg">
            Não há coletas recentes de {productLabel(filtros.produto).toLowerCase()} para este filtro. Experimente outro
            combustível ou um local mais amplo.
          </p>
        </>
      )}
    </motion.div>
  )
}
