const fs = require('fs');

const path = 'src/app/login/page.tsx';
let content = fs.readFileSync(path, 'utf8');

// Replace adminEmail -> email, adminPassword -> password
content = content.replace(/adminEmail/g, 'email');
content = content.replace(/setAdminEmail/g, 'setEmail');
content = content.replace(/adminPassword/g, 'password');
content = content.replace(/setAdminPassword/g, 'setPassword');

// Replace handleAdminSignIn -> handleEmailSignIn
content = content.replace(/handleAdminSignIn/g, 'handleEmailSignIn');

// Update error message in handleEmailSignIn
content = content.replace(/Admin sign in failed:/g, 'Sign in failed:');
content = content.replace(/Admin login failed\./g, 'Login failed.');

// Replace the rider and driver sections
const riderDriverReplacement = `
          {(portal === "rider" || portal === "driver" || portal === "admin") && (
            <div className="mt-8 space-y-6">
              <form onSubmit={handleEmailSignIn} className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-semibold text-neutral-700 mb-1">Email</label>
                  <div className="relative">
                    <Mail size={16} aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                    <input
                      id="email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={portal === "admin" ? "admin@luxe.com" : portal === "driver" ? "driver@luxe.com" : "rider@luxe.com"}
                      className="w-full pl-9 pr-3 py-3 bg-white border border-neutral-300 rounded-lg text-base text-brand focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand placeholder:text-neutral-400"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="password" className="block text-sm font-semibold text-neutral-700 mb-1">Password</label>
                  <div className="relative">
                    <KeyRound size={16} aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                    <input
                      id="password"
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter password"
                      className="w-full pl-9 pr-3 py-3 bg-white border border-neutral-300 rounded-lg text-base text-brand focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand placeholder:text-neutral-400"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-4 py-3 px-4 rounded-xl bg-brand text-white font-semibold text-base hover:bg-neutral-800 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {portal === "admin" && <Shield size={16} aria-hidden="true" />}
                  {portal === "driver" && <Car size={16} aria-hidden="true" />}
                  {portal === "rider" && <User size={16} aria-hidden="true" />}
                  {loading ? "Authenticating..." : "Sign In"}
                </button>
              </form>
              
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-neutral-200"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-white text-neutral-500 font-medium">Or continue with</span>
                </div>
              </div>
              
              {renderSocialButtons()}
            </div>
          )}
`;

// we need to remove the existing portal === rider, portal === driver, and portal === admin blocks.
// Let's use string manipulation

const riderStart = content.indexOf('{portal === "rider" && (');
const adminEnd = content.indexOf('</div>\n          )}\n\n        </div>');

if (riderStart !== -1 && adminEnd !== -1) {
    const before = content.substring(0, riderStart);
    const after = content.substring(adminEnd);
    content = before + riderDriverReplacement + after;
    fs.writeFileSync(path, content, 'utf8');
    console.log("Successfully patched page.tsx");
} else {
    console.log("Failed to find start/end bounds.");
}
