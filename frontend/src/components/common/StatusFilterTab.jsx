import React from 'react';

const StatusFilterTab = ({ currentFilter, onFilterChange }) => {
  const filterButtons = [
    { label: 'ALL', value: 'ALL', width: '85px' },
    { label: 'Stable', value: 'Stable', width: '85px' },
    { label: 'Worsening', value: 'Worsening', width: '137px' },
    { label: 'Normal', value: 'Normal', width: '104px' }
  ];

  return (
    <div style={{ display: 'flex', gap: '16px', marginTop: '10px' }}>
      {filterButtons.map((btn) => {
        const isActive = currentFilter === btn.value;
        return (
          <button
            key={btn.value}
            onClick={() => onFilterChange(btn.value)}
            style={{
              width: btn.width,
              height: '35px',
              backgroundColor: isActive ? '#FE7743' : '#FFFFFF',
              color: isActive ? '#FFFFFF' : 'rgba(0, 0, 0, 0.6)',
              borderRadius: '30px',
              fontFamily: "'Inter', sans-serif",
              fontWeight: '600',
              fontSize: '15px',
              textAlign: 'center',
              border: 'none',
              cursor: 'pointer',
              display: 'inline-flex',
              // 🌟 แก้ไขจุดนี้: เปลี่ยนจาก align-items เป็น alignItems
              alignItems: 'center', 
              justifyContent: 'center',
              transition: 'all 0.25s ease',
              boxShadow: isActive 
                ? '0 6px 16px rgba(254, 119, 67, 0.25)' 
                : '0 4px 12px rgba(0,0,0,0.03)'
            }}
          >
            {btn.label}
          </button>
        );
      })}
    </div>
  );
};

export default StatusFilterTab;