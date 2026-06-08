import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./Navbar.css"; // นำเข้าไฟล์ CSS ที่เราเพิ่งสร้าง

const Navbar = () => {
  const [isSticky, setIsSticky] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [indicatorStyle, setIndicatorStyle] = useState({});
  
  const navLinksRef = useRef(null);
  const dropdownRef = useRef(null);
  
  const navigate = useNavigate();
  const location = useLocation(); // ไว้เช็คว่าตอนนี้อยู่หน้าไหน

  // รายการเมนูและ Path ของมัน
  const navItems = [
    { name: "Dashboard", path: "/dashboard" },
    { name: "Diagnostic", path: "/diagnostic" },
    { name: "Progression", path: "/progression" }
  ];

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // 1. ตรวจจับการ Scroll
  useEffect(() => {
    const handleScroll = () => {
      setIsSticky(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // 2. ปิด Dropdown เมื่อคลิกพื้นที่อื่น
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // 3. จัดการสไลด์กล่องสีส้ม
  const updateIndicator = () => {
    if (navLinksRef.current) {
      const activeElement = navLinksRef.current.querySelector(".active");
      if (activeElement) {
        setIndicatorStyle({
          width: `${activeElement.offsetWidth}px`,
          height: `${activeElement.offsetHeight}px`,
          left: `${activeElement.offsetLeft}px`,
          top: `${activeElement.offsetTop}px`,
        });
      }
    }
  };

  // อัปเดตตำแหน่งกล่องส้มทุกครั้งที่เปลี่ยนหน้า หรือย่อขยายจอ
  useEffect(() => {
    // ให้เวลาระบบเรนเดอร์ UI แป๊บนึงก่อนจับขนาด
    setTimeout(updateIndicator, 50); 
    window.addEventListener("resize", updateIndicator);
    return () => window.removeEventListener("resize", updateIndicator);
  }, [location.pathname]);

  return (
    <nav id="mainNav" className={`${isSticky ? "sticky-nav" : ""} ${mobileMenuOpen ? "mobile-menu-active" : ""}`}>
      {/* ส่วน Logo */}
      <img src="/logo.png" alt="logo" width={100}/>
      
      {/* Hamburger Button for Mobile */}
      <div className="hamburger-btn" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          {mobileMenuOpen ? (
            <>
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </>
          ) : (
            <>
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </>
          )}
        </svg>
      </div>

      {/* ส่วนเมนูกลาง */}
      <div className={`nav-links ${mobileMenuOpen ? "show-mobile" : ""}`} id="g" ref={navLinksRef}>
        <div className="slide-indicator" style={indicatorStyle}></div>
        {navItems.map((item) => (
          <a
            key={item.name}
            className={location.pathname.includes(item.path) ? "active" : ""}
            onClick={(e) => {
              e.preventDefault();
              setMobileMenuOpen(false); // ปิดเมนูเมื่อคลิกเปลี่ยนหน้า
              navigate(item.path);
            }}
          >
            {item.name}
          </a>
        ))}
      </div>

      {/* Right spacer to balance the logo and center nav links on desktop */}
      <div className="nav-spacer"></div>
    </nav>
  );
};

export default Navbar;