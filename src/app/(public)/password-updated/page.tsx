export default function PasswordUpdatedPage() {
  return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#f9fafb'}}>
      <div style={{background:'white',borderRadius:'1rem',padding:'2rem',maxWidth:'400px',width:'90%',textAlign:'center',boxShadow:'0 1px 3px rgba(0,0,0,0.1)'}}>
        <div style={{fontSize:'3rem',marginBottom:'1rem'}}>✓</div>
        <h1 style={{fontWeight:'bold',fontSize:'1.5rem',marginBottom:'0.5rem'}}>Password updated!</h1>
        <p style={{color:'#666',marginBottom:'2rem'}}>Your password has been changed successfully.</p>
        <a href="/login" style={{display:'block',background:'#0f766e',color:'white',padding:'0.75rem',borderRadius:'0.5rem',textDecoration:'none',fontWeight:'500'}}>
          Sign in with your new password →
        </a>
      </div>
    </div>
  )
}
