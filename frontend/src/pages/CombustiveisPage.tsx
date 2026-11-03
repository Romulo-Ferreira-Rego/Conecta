import { motion } from 'motion/react'

import { stagger } from '../lib/motion'
import { EtanolIndicator } from '../features/combustiveis/EtanolIndicator'
import { FilterBar } from '../features/combustiveis/FilterBar'
import { Manchete } from '../features/combustiveis/Manchete'
import { MapaBrasil } from '../features/combustiveis/mapa/MapaBrasil'
import { PriceCards } from '../features/combustiveis/PriceCards'
import { Rankings } from '../features/combustiveis/Rankings'
import { SerieChart } from '../features/combustiveis/SerieChart'

export function CombustiveisPage() {
  return (
    <>
      <title>Preços de combustíveis no Brasil — Conecta Dados</title>
      <meta
        name="description"
        content="Evolução, rankings e comparação dos preços de gasolina, etanol, diesel e GNV por estado e município, com dados abertos da ANP."
      />

      <motion.div initial="hidden" animate="show" variants={stagger}>
        <Manchete />
        <FilterBar />

        <div className="mt-6 space-y-6">
          <PriceCards />

          <div className="grid gap-6 lg:grid-cols-12">
            <div className="lg:col-span-8">
              <SerieChart />
            </div>
            <div className="lg:col-span-4">
              <EtanolIndicator />
            </div>
          </div>

          <div className="grid items-start gap-6 lg:grid-cols-12">
            <div className="lg:col-span-7">
              <MapaBrasil />
            </div>
            <div className="lg:col-span-5">
              <Rankings />
            </div>
          </div>
        </div>
      </motion.div>
    </>
  )
}
