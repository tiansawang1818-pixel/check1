import { Link } from 'react-router-dom';

const shortcuts = [
  { title: 'สร้างบอท', description: 'เลือกตัวอย่างและตั้งเงื่อนไข', href: '/bots/new' },
  { title: 'บอทของฉัน', description: 'แก้ไข ทดสอบ และเผยแพร่', href: '/bots' },
  { title: 'ประวัติการใช้งาน', description: 'ตรวจข้อมูลและผลลัพธ์ที่ผ่านมา', href: '/history' },
];

export function GalleryWall() {
  return <nav className="gallery-wall workspace-shortcuts" aria-label="ทางลัด">
    <div className="gallery-hang">{shortcuts.map(item => <Link className="gallery-work" to={item.href} key={item.href}>
      <div className="gallery-label"><h3>{item.title} <span aria-hidden="true">↗</span></h3><p>{item.description}</p></div>
    </Link>)}</div>
  </nav>;
}
