import { Link } from 'react-router'

import { useMeta } from '../api/hooks'
import { Article } from '../components/ui/Article'
import { formatDate, formatMonthLong } from '../lib/format'

const ANP_URL =
  'https://www.gov.br/anp/pt-br/centrais-de-conteudo/dados-abertos/serie-historica-de-precos-de-combustiveis'

export function SobreDadosPage() {
  const { data: meta } = useMeta()
  const periodo =
    meta?.primeira_coleta && meta.ultima_coleta
      ? `de ${formatMonthLong(meta.primeira_coleta)} a ${formatMonthLong(meta.ultima_coleta)}`
      : 'dos últimos 24 meses'

  return (
    <>
      <title>Sobre os dados — Conecta Dados</title>
      <meta
        name="description"
        content="Fonte, metodologia, frequência de atualização e limitações dos dados de preços de combustíveis usados pelo Conecta Dados."
      />
      <Article
        eyebrow="Conecta Dados · Metodologia"
        title="Sobre os dados"
        lede="De onde vêm os preços mostrados no painel, como eles são calculados e o que eles não dizem."
        meta={
          meta?.ultima_importacao ? (
            <>
              Última atualização dos dados: <strong className="font-medium text-ink">{formatDate(meta.ultima_importacao)}</strong>
            </>
          ) : undefined
        }
        sections={[
          {
            id: 'fonte',
            title: 'Fonte',
            content: (
              <>
                <p>
                  Todos os preços vêm da{' '}
                  <a href={ANP_URL} target="_blank" rel="noreferrer">
                    Série Histórica de Preços de Combustíveis
                  </a>
                  , publicada como dado aberto pela <strong>ANP</strong> (Agência Nacional do Petróleo, Gás Natural e
                  Biocombustíveis), órgão do Governo Federal.
                </p>
                <p>
                  O painel usa os arquivos semestrais e mensais de combustíveis automotivos. O período disponível hoje vai{' '}
                  <strong>{periodo}</strong>.
                </p>
              </>
            ),
          },
          {
            id: 'coleta',
            title: 'Como a ANP coleta os preços',
            content: (
              <>
                <p>
                  A ANP faz um <strong>levantamento semanal</strong>, realizado por uma empresa contratada, que visita
                  postos de combustíveis e registra o preço de venda ao consumidor. A pesquisa cobre cerca de{' '}
                  <strong>420 municípios</strong> nas 27 unidades da federação.
                </p>
                <p>Os produtos acompanhados no painel são:</p>
                <ul>
                  <li>Gasolina comum e gasolina aditivada</li>
                  <li>Etanol hidratado</li>
                  <li>Óleo diesel S500 (exibido como "Diesel") e S10</li>
                  <li>GNV (gás natural veicular), em reais por metro cúbico</li>
                </ul>
              </>
            ),
          },
          {
            id: 'calculo',
            title: 'Como o Conecta calcula os números',
            content: (
              <>
                <h3>Preço médio</h3>
                <p>
                  É a média de todas as coletas do mês. Nas médias de estado e do Brasil, cada município pesa pelo
                  número de coletas feitas nele (média ponderada). Assim, uma cidade com 5 coletas não pesa o mesmo que
                  uma capital com centenas.
                </p>
                <h3>Variação</h3>
                <p>Compara o preço médio do mês mais recente com o do mês anterior disponível.</p>
                <h3>Rankings</h3>
                <p>
                  Usam o mês mais recente. Um município só entra no ranking se tiver pelo menos{' '}
                  <strong>10 coletas no mês</strong>, para evitar que um único posto distorça o resultado.
                </p>
                <h3>Etanol ou gasolina?</h3>
                <p>
                  Usa a regra prática dos 70%: como o etanol rende cerca de 70% da gasolina, ele compensa quando custa até
                  70% do preço dela. O consumo real varia conforme o carro e o jeito de dirigir.
                </p>
              </>
            ),
          },
          {
            id: 'atualizacao',
            title: 'Frequência de atualização',
            content: (
              <p>
                Um processo automático verifica a página da ANP <strong>toda semana</strong>, baixa apenas os arquivos
                novos ou atualizados e importa os dados sem duplicar registros. A ANP publica os dados com algumas semanas
                de atraso, por isso o mês mais recente do painel costuma ser o mês anterior ao atual.
              </p>
            ),
          },
          {
            id: 'limitacoes',
            title: 'Limitações',
            content: (
              <ul>
                <li>
                  <strong>Não são preços em tempo real.</strong> Os valores são médias mensais e podem ser diferentes do
                  preço que você encontra hoje no posto.
                </li>
                <li>
                  <strong>É uma amostra.</strong> A pesquisa não inclui todos os postos do país nem todos os municípios
                  (cerca de 420 são acompanhados).
                </li>
                <li>
                  Municípios com poucas coletas têm médias mais sensíveis a um único posto.
                </li>
                <li>
                  Os nomes dos municípios aparecem sem acento, como a ANP os publica.
                </li>
                <li>O gás de cozinha (GLP) ainda não faz parte do painel.</li>
                <li>
                  O painel não mostra dados de postos individuais (endereço ou CNPJ), apenas médias por município e
                  estado.
                </li>
              </ul>
            ),
          },
          {
            id: 'reutilizar',
            title: 'Reutilização',
            content: (
              <p>
                Os dados originais são públicos e podem ser baixados diretamente no{' '}
                <a href={ANP_URL} target="_blank" rel="noreferrer">
                  site da ANP
                </a>
                . O código do Conecta é aberto; veja a página <Link to="/sobre">Sobre o projeto</Link>.
              </p>
            ),
          },
        ]}
      />
    </>
  )
}
