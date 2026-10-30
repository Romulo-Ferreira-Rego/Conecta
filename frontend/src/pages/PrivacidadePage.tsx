import { Article } from '../components/ui/Article'
import { ContactEmail } from '../components/ui/ContactEmail'
import { openCookiePreferences } from '../lib/consent'

// Atualize esta data sempre que o texto mudar (seção 7.3, item 6).
const ULTIMA_ATUALIZACAO = '30 de outubro de 2026'

export function PrivacidadePage() {
  return (
    <>
      <title>Política de Privacidade — Conecta</title>
      <meta
        name="description"
        content="Como o Conecta trata dados pessoais: o que é coletado, por quê, por quanto tempo e como exercer seus direitos pela LGPD."
      />
      <Article
        eyebrow="Conecta · Privacidade"
        title="Política de Privacidade"
        lede="O Conecta não tem cadastro, não pede seus dados e não usa cookies de publicidade ou rastreamento. Esta página explica, de forma direta, o pouco que é tratado e por quê."
        meta={<>Última atualização: {ULTIMA_ATUALIZACAO} · Lei nº 13.709/2018 (LGPD)</>}
        sections={[
          {
            id: 'responsavel',
            title: '1. Quem é o responsável',
            content: (
              <>
                <p>
                  O Conecta é um projeto pessoal de <strong>Rômulo Ferreira Rego</strong>, que é o controlador dos dados
                  tratados neste site.
                </p>
                <p>
                  Para qualquer assunto sobre privacidade, inclusive para exercer seus direitos, escreva para{' '}
                  <ContactEmail />.
                </p>
              </>
            ),
          },
          {
            id: 'dados',
            title: '2. Quais dados são tratados e para quê',
            content: (
              <>
                <h3>No seu navegador</h3>
                <p>
                  O site <strong>não grava cookies</strong>. Ele guarda apenas duas informações no armazenamento local do
                  seu navegador, que nunca são enviadas para nós:
                </p>
                <ul>
                  <li>
                    <strong>Tema escolhido</strong> (claro ou escuro), para manter sua preferência entre as visitas.
                  </li>
                  <li>
                    <strong>Sua escolha sobre recursos opcionais</strong> (aceitar ou recusar), para não perguntar de novo.
                  </li>
                </ul>
                <p>Você pode apagar essas informações a qualquer momento limpando os dados do site no navegador.</p>

                <h3>No servidor</h3>
                <ul>
                  <li>
                    <strong>Registros de funcionamento (logs):</strong> guardam apenas a página da API acessada, o resultado
                    e o tempo de resposta. <strong>Não guardam seu endereço IP</strong> nem os filtros que você usou.
                  </li>
                  <li>
                    <strong>Proteção contra abuso:</strong> para limitar o número de requisições, o endereço IP fica apenas
                    na memória do servidor por até 1 minuto e depois é descartado. Ele nunca é gravado em disco.
                  </li>
                </ul>

                <h3>O que não fazemos</h3>
                <ul>
                  <li>Não há cadastro, login ou formulários: não coletamos nome, e-mail ou CPF.</li>
                  <li>Não usamos ferramentas de publicidade, redes sociais ou rastreamento.</li>
                  <li>
                    A fonte do site é hospedada no próprio site: seu navegador não precisa contatar serviços como o Google
                    Fonts.
                  </li>
                  <li>Os filtros que você escolhe ficam apenas no endereço da página (URL).</li>
                </ul>
              </>
            ),
          },
          {
            id: 'base-legal',
            title: '3. Base legal e tempo de retenção',
            content: (
              <>
                <p>
                  Os registros técnicos e a proteção contra abuso se baseiam no <strong>legítimo interesse</strong> (art.
                  7º, IX, da LGPD): são necessários para manter o site seguro e funcionando, usam o mínimo de dados e não
                  identificam você.
                </p>
                <p>
                  Se no futuro algum recurso opcional for adicionado, como estatísticas de visitas, ele só será ativado com
                  o seu <strong>consentimento</strong> (art. 7º, I), que você pode retirar a qualquer momento.
                </p>
                <ul>
                  <li>IP para limite de requisições: até 1 minuto, apenas em memória.</li>
                  <li>Registros de funcionamento: no máximo 30 dias.</li>
                  <li>Preferências no navegador: até você apagá-las.</li>
                </ul>
              </>
            ),
          },
          {
            id: 'terceiros',
            title: '4. Compartilhamento com terceiros',
            content: (
              <>
                <p>
                  Nenhum dado é vendido ou compartilhado para fins comerciais. O site depende apenas de{' '}
                  <strong>provedores de hospedagem</strong> (do site, da API e do banco de dados), que podem registrar dados
                  técnicos de acesso, como o endereço IP, em seus próprios sistemas e conforme suas políticas. Esses
                  provedores podem estar localizados fora do Brasil.
                </p>
                <p>Os provedores utilizados serão listados aqui quando o site for publicado.</p>
              </>
            ),
          },
          {
            id: 'direitos',
            title: '5. Seus direitos',
            content: (
              <>
                <p>Pelo art. 18 da LGPD, você pode, a qualquer momento:</p>
                <ul>
                  <li>confirmar se tratamos dados seus e ter acesso a eles;</li>
                  <li>corrigir dados incompletos ou desatualizados;</li>
                  <li>pedir a anonimização, o bloqueio ou a eliminação de dados desnecessários;</li>
                  <li>pedir a portabilidade dos dados;</li>
                  <li>saber com quem os dados são compartilhados;</li>
                  <li>retirar o consentimento, quando ele for a base do tratamento.</li>
                </ul>
                <p>
                  Para isso, escreva para <ContactEmail />. A resposta será enviada em até 15 dias. Como o site quase não
                  trata dados pessoais, na maioria dos casos a resposta será a confirmação de que não há dados seus
                  armazenados. Você também pode apresentar reclamação à Autoridade Nacional de Proteção de Dados (ANPD).
                </p>
                <p>
                  Para rever sua escolha sobre recursos opcionais,{' '}
                  <button
                    type="button"
                    onClick={openCookiePreferences}
                    className="font-medium text-brand-ink underline decoration-line-strong underline-offset-4 hover:decoration-brand"
                  >
                    abra as preferências de cookies
                  </button>
                  .
                </p>
              </>
            ),
          },
          {
            id: 'atualizacao',
            title: '6. Atualizações desta política',
            content: (
              <p>
                Esta política pode mudar quando o site ganhar novos recursos. A data da última atualização aparece no topo
                da página: <strong>{ULTIMA_ATUALIZACAO}</strong>.
              </p>
            ),
          },
          {
            id: 'dados-anp',
            title: 'Nota: os dados de preços da ANP',
            content: (
              <p>
                Os preços exibidos vêm de dados públicos da ANP sobre <strong>estabelecimentos comerciais</strong> (postos
                de combustíveis), não sobre pessoas. Eles são usados apenas para informar preços, sempre citando a fonte,
                e o painel mostra somente médias por município e estado, sem detalhar postos individuais.
              </p>
            ),
          },
        ]}
      />
    </>
  )
}
