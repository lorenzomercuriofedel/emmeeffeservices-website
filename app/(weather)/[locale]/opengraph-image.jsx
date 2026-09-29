import { ImageResponse } from 'next/og';

export const alt = 'emme-effe meteo';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '72px 80px',
          background:
            'linear-gradient(180deg, #0a2942 0%, #144e7a 55%, #1f6498 100%)',
          color: 'white',
          fontFamily: 'Manrope, system-ui, sans-serif',
          position: 'relative',
        }}
      >
        {/* Glow caldo top-left */}
        <div
          style={{
            position: 'absolute',
            top: -200,
            left: -200,
            width: 700,
            height: 700,
            background: 'radial-gradient(circle, rgba(245,165,36,0.18), transparent 70%)',
          }}
        />
        {/* Sole stilizzato */}
        <div
          style={{
            position: 'absolute',
            top: 90,
            right: 130,
            width: 110,
            height: 110,
            borderRadius: 9999,
            background:
              'radial-gradient(circle, #fff6d8 0%, #ffd584 55%, rgba(255,213,132,0) 75%)',
            boxShadow: '0 0 80px 25px rgba(255,225,150,0.4)',
          }}
        />

        {/* Tagline top */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            fontSize: 22,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: 'rgba(202,230,255,0.7)',
            fontWeight: 600,
          }}
        >
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: 9999,
              background: '#34d399',
              boxShadow: '0 0 12px #34d399',
            }}
          />
          Live · Trentino
        </div>

        {/* Title */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              display: 'flex',
              fontSize: 100,
              fontWeight: 800,
              lineHeight: 1.0,
              letterSpacing: '-0.025em',
              color: 'white',
            }}
          >
            emme-effe
          </div>
          <div
            style={{
              display: 'flex',
              fontSize: 100,
              fontWeight: 800,
              lineHeight: 1.0,
              letterSpacing: '-0.025em',
              color: '#f5a524',
              marginTop: 6,
            }}
          >
            meteo
          </div>
          <div
            style={{
              display: 'flex',
              fontSize: 30,
              fontWeight: 400,
              color: 'rgba(202,230,255,0.78)',
              marginTop: 28,
              maxWidth: 900,
              lineHeight: 1.35,
            }}
          >
            Rilevazioni meteorologiche in tempo reale dalle stazioni amatoriali
            sull&apos;altopiano trentino, dal 2014.
          </div>
        </div>

        {/* Footer line */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingTop: 28,
            borderTop: '1px solid rgba(202,230,255,0.18)',
            fontSize: 22,
            color: 'rgba(202,230,255,0.6)',
          }}
        >
          <div style={{ fontWeight: 600, color: 'white', letterSpacing: '0.04em' }}>
            emmeeffeservices.it/meteo
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <span>A.P.S. Meteo Trentino Alto Adige · stazioni live</span>
          </div>
        </div>

        {/* Silhouette montagne in basso */}
        <svg
          width="1200"
          height="160"
          viewBox="0 0 1200 160"
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
          }}
        >
          <path
            d="M0 160 L0 110 Q 80 80 180 95 T 360 85 T 540 70 T 720 80 T 900 65 T 1080 75 L 1200 70 L 1200 160 Z"
            fill="rgba(255,255,255,0.07)"
          />
          <path
            d="M0 160 L0 130 Q 200 105 400 120 T 800 118 T 1200 125 L 1200 160 Z"
            fill="rgba(255,255,255,0.13)"
          />
        </svg>
      </div>
    ),
    { ...size }
  );
}
