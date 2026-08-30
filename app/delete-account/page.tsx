export default function DeleteAccount() {
  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '40px 24px', fontFamily: 'Arial, sans-serif', lineHeight: 1.7, color: '#1e293b' }}>
      <h1 style={{ fontSize: 30, fontWeight: 900, marginBottom: 6 }}>Exclusão de Conta — BeachPró Super 8 Beach Tennis</h1>
      <p><strong>Aplicativo:</strong> BeachPró Super 8 Beach Tennis</p>
      <p><strong>Identificador:</strong> com.beachpro.app</p>
      <p><strong>Desenvolvedor responsável:</strong> Marcelo Rassweiler Borges</p>
      <p><strong>Contato:</strong> btpro.app@gmail.com</p>
      <h2 style={{ fontSize: 20, marginTop: 32 }}>Como solicitar a exclusão</h2>
      <p>Para excluir sua conta do BeachPró e os dados associados, clique no botão abaixo e envie a mensagem usando o mesmo endereço de e-mail cadastrado no aplicativo.</p>
      <a href="mailto:btpro.app@gmail.com?subject=Exclus%C3%A3o%20de%20conta%20BeachPr%C3%B3&body=Solicito%20a%20exclus%C3%A3o%20da%20minha%20conta%20e%20dos%20dados%20associados%20ao%20aplicativo%20BeachPr%C3%B3.%0A%0AE-mail%20cadastrado%3A%20" style={{ display: 'inline-block', margin: '16px 0', padding: '14px 20px', borderRadius: 12, background: '#005f99', color: '#fff', fontWeight: 800, textDecoration: 'none' }}>SOLICITAR EXCLUSÃO DA CONTA</a>
      <p>Se o botão não funcionar, envie um e-mail para <strong>btpro.app@gmail.com</strong> com o assunto <strong>“Exclusão de conta BeachPró”</strong> e informe o e-mail cadastrado.</p>
      <h2 style={{ fontSize: 20, marginTop: 32 }}>O que será excluído</h2>
      <ul>
        <li>conta de acesso, nome, e-mail e foto de perfil;</li>
        <li>torneios, ligas e rankings criados pelo usuário, quando aplicável;</li>
        <li>históricos, resultados e demais dados associados à conta;</li>
        <li>imagens e arquivos vinculados à conta, quando aplicável.</li>
      </ul>
      <h2 style={{ fontSize: 20, marginTop: 32 }}>Prazo e confirmação</h2>
      <p>A solicitação será processada em até 7 dias úteis. Poderemos pedir uma confirmação de identidade para impedir exclusões indevidas. Após a conclusão, enviaremos uma confirmação ao endereço informado.</p>
      <h2 style={{ fontSize: 20, marginTop: 32 }}>Dados eventualmente mantidos</h2>
      <p>Dados somente serão mantidos quando necessários para cumprimento de obrigação legal, prevenção de fraude, segurança ou resolução de disputas, pelo prazo estritamente necessário. Cópias residuais poderão permanecer temporariamente em backups até o ciclo técnico de exclusão.</p>
      <h2 style={{ fontSize: 20, marginTop: 32 }}>Assinaturas</h2>
      <p>A exclusão da conta não cancela automaticamente uma assinatura ativa. O cancelamento deve ser realizado diretamente na Google Play Store ou Apple App Store.</p>
      <p style={{ marginTop: 32 }}>Consulte também a <a href="/privacy">Política de Privacidade do BeachPró Super 8 Beach Tennis</a>.</p>
    </main>
  );
}
