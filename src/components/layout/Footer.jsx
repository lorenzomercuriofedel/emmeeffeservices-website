import ContactSection from './ContactSection';
import styles from './Footer.module.css';

export default function Footer({ section }) {
  return (
    <><ContactSection /><div className={styles.band}><footer className={styles.footer}><div><p>© 2026 Lorenzo Mercurio Fedel</p></div><p>P. IVA 02833120229 · C.F. MRCLNZ97P29L378M · Via dello Stadio 7, Baselga di Piné (TN)</p><div><a href="/privacy">Privacy Policy</a><span> · </span><a href="/cookie">Cookie Policy</a>{section === 'meteo' && <><span> · </span><a href="/termini-meteo">T&amp;C meteo</a></>}</div></footer></div></>
  );
}
