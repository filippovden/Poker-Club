import PageLayout from '../components/PageLayout.jsx'
import './About.css'

const RULES = [
  'Уважайте соперников и дилеров — оскорбления и споры на повышенных тонах недопустимы.',
  'Мобильные телефоны — только в режиме бесшумного использования вне игры за столом.',
  'Решения дилера по игровым ситуациям окончательны и обсуждаются только с турнирным директором.',
  'Раскрытие карт и обсуждение руки во время раздачи запрещено (no talking about live hands).',
  'Опоздание к началу турнира более чем на уровень блайндов — потеря стека без докупа (если не указано иное).',
]

const CONTACTS = [
  { label: 'Email', value: 'info@lockdownpoker.club', href: 'mailto:info@lockdownpoker.club' },
  { label: 'Телефон', value: '+7 (900) 000-00-00', href: 'tel:+79000000000' },
  { label: 'Telegram', value: '@lockdownpoker', href: 'https://t.me/lockdownpoker' },
]

export default function About() {
  return (
    <PageLayout>
      <div className="page">
        <div className="page-inner">
          <div className="page-eyebrow">
            <span className="dot" />
            <span>О клубе</span>
          </div>
          <h1 className="page-title">Lockdown Poker</h1>
          <p className="page-lede">
            Клуб турнирного покера для тех, кто ценит честную игру и живую
            атмосферу за столом. Еженедельные турниры по No-Limit Hold'em и
            Pot-Limit Omaha, дружелюбное сообщество и профессиональные дилеры.
          </p>

          <section className="about-section">
            <h2 className="about-heading">Правила клуба</h2>
            <ol className="about-rules">
              {RULES.map((rule) => (
                <li key={rule}>{rule}</li>
              ))}
            </ol>
          </section>

          <section className="about-section">
            <h2 className="about-heading">Форматы игры</h2>
            <div className="about-formats">
              <div className="about-format-card">
                <span className="tag">NLH</span>
                <p>No-Limit Hold'em — классический формат, основа расписания клуба.</p>
              </div>
              <div className="about-format-card">
                <span className="tag">PLO</span>
                <p>Pot-Limit Omaha — для тех, кто хочет больше динамики и вариативности.</p>
              </div>
              <div className="about-format-card">
                <span className="tag">MTT</span>
                <p>Многостоловые турниры с гарантированным призовым фондом.</p>
              </div>
            </div>
          </section>

          <section className="about-section">
            <h2 className="about-heading">Контакты</h2>
            <div className="about-contacts">
              {CONTACTS.map((c) => (
                <a key={c.label} href={c.href} className="about-contact-item">
                  <span className="about-contact-label">{c.label}</span>
                  <span>{c.value}</span>
                </a>
              ))}
            </div>
          </section>
        </div>
      </div>
    </PageLayout>
  )
}
