export default function NotFound() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontFamily: 'sans-serif' }}>
      <h1>404</h1>
      <p>Página não encontrada</p>
      <a href="/" style={{ color: '#005f99', textDecoration: 'underline' }}>Voltar ao início</a>
    </div>
  );
}
