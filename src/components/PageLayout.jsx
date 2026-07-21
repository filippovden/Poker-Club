import Navbar from './Navbar.jsx'
import Footer from './Footer.jsx'

export default function PageLayout({ children }) {
  return (
    <>
      <Navbar animated={false} />
      {children}
      <Footer />
    </>
  )
}
