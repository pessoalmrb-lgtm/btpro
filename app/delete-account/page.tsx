export default function DeleteAccount() {
  return (
    <main style={{ maxWidth: 680, margin: '0 auto', padding: '40px 24px', fontFamily: 'sans-serif', lineHeight: 1.7, color: '#1e293b' }}>
      <h1 style={{ fontSize: 28, fontWeight: 900, marginBottom: 8 }}>Exclusão de Conta</h1>
      <p style={{ color: '#64748b', marginBottom: 32 }}>BeachPró — Solicitação de exclusão de dados</p>

      <h2 style={{ fontSize: 18, fontWeight: 700, marginTop: 32 }}>Como solicitar a exclusão da sua conta</h2>
      <p>Para solicitar a exclusão da sua conta e de todos os seus dados do BeachPró, envie um e-mail para:</p>
      <p style={{ fontSize: 20, fontWeight: 900, margin: '16px 0' }}>btpro.app@gmail.com</p>
      <p>Com o assunto: <strong>Exclusão de conta</strong></p>
      <p>Informe no e-mail o endereço de e-mail cadastrado na sua conta. Processaremos sua solicitação em até 7 dias úteis.</p>

      <h2 style={{ fontSize: 18, fontWeight: 700, marginTop: 32 }}>Dados que serão excluídos</h2>
      <ul>
        <li>Nome e endereço de e-mail</li>
        <li>Foto de perfil</li>
        <li>Torneios criados</li>
        <li>Histórico de resultados</li>
        <li>Participações em ligas e rankings</li>
      </ul>

      <h2 style={{ fontSize: 18, fontWeight: 700, marginTop: 32 }}>Dados mantidos</h2>
      <p>Nenhum dado pessoal é mantido após a exclusão da conta.</p>
    </main>
  );
}