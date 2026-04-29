import React from 'react';

export const BlackHoleBackground = () => {
  return (
    <div className="fixed inset-0 z-0 bg-[#020617] overflow-hidden pointer-events-none">
      {/* Stars Generation */}
      <div className="absolute inset-0 opacity-80" style={{
        backgroundImage: `
          radial-gradient(1px 1px at 20px 30px, #ffffff, transparent),
          radial-gradient(1px 1px at 40px 70px, #e2e8f0, transparent),
          radial-gradient(1px 1px at 50px 160px, #ffffff, transparent),
          radial-gradient(1px 1px at 90px 40px, #cbd5e1, transparent),
          radial-gradient(1px 1px at 130px 80px, #ffffff, transparent),
          radial-gradient(1px 1px at 160px 120px, #f8fafc, transparent),
          radial-gradient(2px 2px at 200px 150px, #ffffff, transparent),
          radial-gradient(1.5px 1.5px at 250px 50px, #bfdbfe, transparent),
          radial-gradient(1px 1px at 300px 180px, #ffffff, transparent)
        `,
        backgroundRepeat: 'repeat',
        backgroundSize: '350px 250px'
      }} />

      {/* Galaxy Dust / Nebula */}
      <div className="absolute inset-0 opacity-60 mix-blend-screen" style={{
        background: 'radial-gradient(circle at 30% 70%, rgba(30, 58, 138, 0.5) 0%, transparent 60%), radial-gradient(circle at 80% 20%, rgba(147, 51, 234, 0.3) 0%, transparent 50%)'
      }} />

      {/* The Black Hole Centered */}
      <div className="absolute top-[40%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px]">
        {/* Base Glow */}
        <div className="absolute inset-0 rounded-full mix-blend-screen" style={{
          background: 'radial-gradient(circle at center, transparent 15%, rgba(59, 130, 246, 0.25) 30%, transparent 65%)',
          filter: 'blur(40px)'
        }} />
        
        {/* Accretion Disk (Background part) */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rotate-[15deg] scale-y-[0.25]">
          <div className="w-full h-full rounded-full animate-[spin_20s_linear_infinite]" style={{
            background: 'conic-gradient(from 0deg, rgba(59,130,246,0) 0%, rgba(59,130,246,0.9) 25%, rgba(147,51,234,1) 50%, rgba(59,130,246,0.9) 75%, rgba(59,130,246,0) 100%)',
            filter: 'blur(10px)',
            boxShadow: '0 0 120px 40px rgba(59, 130, 246, 0.7), inset 0 0 60px 20px rgba(147, 51, 234, 0.5)'
          }} />
        </div>

        {/* Event Horizon (Black part) */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-56 h-56 bg-black rounded-full shadow-[0_0_50px_20px_rgba(0,0,0,1),0_0_100px_40px_rgba(30,58,138,0.95),inset_0_0_30px_rgba(0,0,0,1)] z-10" />
        
        {/* Photon Ring */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[232px] h-[232px] rounded-full border-[3px] border-blue-200/80 blur-[2px] z-10" />
        
        {/* Accretion Disk (Foreground part) */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rotate-[15deg] scale-y-[0.25] z-20" style={{ clipPath: 'polygon(0 50%, 100% 50%, 100% 100%, 0 100%)' }}>
          <div className="w-full h-full rounded-full animate-[spin_20s_linear_infinite]" style={{
            background: 'conic-gradient(from 0deg, rgba(59,130,246,0) 0%, rgba(59,130,246,0.9) 25%, rgba(147,51,234,1) 50%, rgba(59,130,246,0.9) 75%, rgba(59,130,246,0) 100%)',
            filter: 'blur(8px)',
            boxShadow: '0 0 100px 30px rgba(59, 130, 246, 0.8), inset 0 0 50px 15px rgba(147, 51, 234, 0.6)'
          }} />
          {/* Inner hot ring */}
          <div className="absolute inset-6 rounded-full border-[6px] border-blue-100/60 blur-[2px]" />
        </div>
      </div>
    </div>
  );
};
