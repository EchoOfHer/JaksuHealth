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
    <nav id="mainNav" className={isSticky ? "sticky-nav" : ""}>
      {/* ส่วน Logo */}
      <img src="/logo.png" alt="logo" width={100}/>
      
      {/* ส่วนเมนูกลาง */}
      <div className="nav-links" id="g" ref={navLinksRef}>
        <div className="slide-indicator" style={indicatorStyle}></div>
        {navItems.map((item) => (
          <a
            key={item.name}
            className={location.pathname.includes(item.path) ? "active" : ""}
            onClick={(e) => {
              e.preventDefault();
              navigate(item.path);
            }}
          >
            {item.name}
          </a>
        ))}
      </div>

      {/* ส่วนโปรไฟล์ */}
      <div className="profile-section" ref={dropdownRef}>
        <img src="/userImg.png" alt="user" width={50} height={50} style={{ borderRadius: "50%" }}/>
        <svg
          id="downArrow"
          onClick={() => setDropdownOpen(!dropdownOpen)}
          style={{ transform: dropdownOpen ? "rotate(180deg)" : "rotate(0deg)" }}
          width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
        
        {/* Dropdown */}
        <div className={`dropdown-card ${dropdownOpen ? "show" : ""}`} id="profileCard">
          <div className="dropdown-profile">
            <img src="/userImg.png" alt="user" width={40} height={40} style={{ borderRadius: "50%" }}/>
            <span style={{ opacity: 0.6, fontWeight: "500" }}>Dr.Stone K.</span>
          </div>
          
          <a href="#" className="menu-item-with-icon">
            <img src="/support.png" alt="user" width={40} height={40} style={{ borderRadius: "50%" }}/>
            <span style={{ opacity: 0.6, fontWeight: "500" }}>Support</span>
          </a>

          <hr style={{ width: "100%", border: 0, borderTop: "1px solid #ECECEC", margin: "5px 0" }} />
          
          {/* 👈 จุดที่แก้ไข: ใส่ onClick และ navigate('/login') */}
          <a 
            href="#" 
            onClick={(e) => {
              e.preventDefault(); // ป้องกันไม่ให้หน้าเว็บกระตุกขึ้นไปด้านบนสุด
              setDropdownOpen(false); // สั่งปิด Dropdown
              navigate('/login'); // เปลี่ยนหน้ากลับไปที่ Login
            }}
            style={{ color: "white", background: "#FE7743", textAlign: "center", fontWeight: "bold", paddingTop: 15, paddingBottom: 15 }}
          >
            Log Out
          </a>
        </div>
      </div> 
    </nav>
  );
};

export default Navbar;