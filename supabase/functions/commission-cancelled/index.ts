// Where Stripe Checkout redirects a business if they back out of paying
// their commission (see APP_PUBLIC_URL in create-commission-checkout).
// Nothing was charged and nothing needs to be undone — this is purely a
// confirmation screen. Public by design (see supabase/config.toml): Stripe's
// redirect is a plain browser visit with no auth token attached.
const PAGE = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Payment cancelled — RockServ</title>
<style>
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #F1F5F9;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    padding: 24px;
  }
  .card {
    background: #FFFFFF;
    border-radius: 24px;
    padding: 40px 32px;
    max-width: 380px;
    width: 100%;
    text-align: center;
    box-shadow: 0 20px 40px rgba(15, 30, 70, 0.12);
  }
  .icon {
    width: 64px;
    height: 64px;
    border-radius: 999px;
    background: #94A3B8;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 20px;
  }
  h1 {
    font-size: 20px;
    font-weight: 800;
    color: #0F1E46;
    margin: 0 0 8px;
  }
  p {
    font-size: 14.5px;
    line-height: 1.5;
    color: #52607A;
    margin: 0;
  }
</style>
</head>
<body>
  <div class="card">
    <div class="icon">
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
        <path d="M6 6l12 12M18 6L6 18" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </div>
    <h1>Payment cancelled</h1>
    <p>No payment was made. You can close this tab and return to the RockServ app to try again whenever you're ready.</p>
  </div>
</body>
</html>`;

Deno.serve(() => new Response(PAGE, { headers: { 'Content-Type': 'text/html; charset=utf-8' } }));
