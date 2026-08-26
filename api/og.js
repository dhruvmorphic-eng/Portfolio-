import { ImageResponse } from '@vercel/og';

export const config = { runtime: 'edge' };

export default function handler(req) {
  const { searchParams } = new URL(req.url);
  const title = (searchParams.get('title') || 'Dhruv Pradeep').slice(0, 140);
  const label = (searchParams.get('label') || 'Blog').slice(0, 40);

  return new ImageResponse(
    (
      {
        type: 'div',
        props: {
          style: {
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            backgroundColor: '#000',
            color: '#fff',
            padding: '80px',
            fontFamily: 'Arial, sans-serif',
          },
          children: [
            {
              type: 'div',
              props: {
                style: {
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  fontSize: 26,
                  letterSpacing: '4px',
                  textTransform: 'uppercase',
                  color: 'rgba(255,255,255,0.45)',
                },
                children: [
                  {
                    type: 'span',
                    props: {
                      style: {
                        width: '10px',
                        height: '10px',
                        borderRadius: '50%',
                        backgroundColor: '#fff',
                        display: 'block',
                      },
                    },
                  },
                  { type: 'span', props: { children: label } },
                ],
              },
            },
            {
              type: 'div',
              props: {
                style: {
                  fontSize: 68,
                  fontWeight: 800,
                  lineHeight: 1.15,
                  letterSpacing: '-2px',
                  maxWidth: '980px',
                },
                children: title,
              },
            },
            {
              type: 'div',
              props: {
                style: {
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-end',
                  fontSize: 30,
                  fontWeight: 800,
                  letterSpacing: '-1px',
                },
                children: [
                  { type: 'span', props: { children: 'Dhruv Pradeep' } },
                  {
                    type: 'span',
                    props: {
                      style: { fontSize: 22, fontWeight: 400, color: 'rgba(255,255,255,0.4)' },
                      children: 'dhruvpradeep.in',
                    },
                  },
                ],
              },
            },
          ],
        },
      }
    ),
    { width: 1200, height: 630 }
  );
}
