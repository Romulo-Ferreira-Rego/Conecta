// Formato das respostas da API (espelha backend/app/schemas.py).

export interface Produto {
  codigo: string
  nome: string
  unidade: string
}

export interface Estado {
  sigla: string
  nome: string
  regiao: string
}

export interface Municipio {
  id: number
  nome: string
  uf: string
}

export interface Resumo {
  produto: string
  nome: string
  unidade: string
  mes: string
  preco_medio: number
  qtd_coletas: number
  mes_anterior: string | null
  preco_anterior: number | null
  variacao: number | null
  variacao_percentual: number | null
}

export interface PontoSerie {
  mes: string
  preco_medio: number
  preco_min: number
  preco_max: number
  qtd_coletas: number
}

export interface Serie {
  produto: string
  unidade: string
  pontos: PontoSerie[]
}

export interface ItemRanking {
  posicao: number
  nome: string
  uf: string
  municipio_id: number | null
  preco_medio: number
  qtd_coletas: number
}

export interface Ranking {
  produto: string
  nivel: 'uf' | 'municipio'
  ordem: 'asc' | 'desc'
  mes: string | null
  itens: ItemRanking[]
}

export interface EtanolGasolina {
  mes: string
  preco_etanol: number
  preco_gasolina: number
  razao: number
  percentual: number
  limite: number
  recomendacao: 'etanol' | 'gasolina'
}

export interface Meta {
  ultima_importacao: string | null
  primeira_coleta: string | null
  ultima_coleta: string | null
  fonte: string
}

export interface AreaMapa {
  uf: string
  nome: string
  /** Só no nível município */
  municipio_id: number | null
  codigo_ibge: number | null
  preco_medio: number
  qtd_coletas: number
  preco_anterior: number | null
  variacao_percentual: number | null
}

export interface Mapa {
  produto: string
  unidade: string
  nivel: 'uf' | 'municipio'
  uf: string | null
  mes: string | null
  mes_anterior: string | null
  /** Abaixo disso, a amostra do mês é pequena */
  min_coletas: number
  itens: AreaMapa[]
}
