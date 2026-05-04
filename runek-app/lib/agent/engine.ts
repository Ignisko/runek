import { chromium } from "playwright";
import * as path from "path";
import * as fs from "fs";

/**
 * RUNEK AI JOB ASSISTANT - NO-NONSENSE AUTOPILOT
 * Targeted: JustJoinIT
 */

const USERDATA_DIR = path.join(process.cwd(), "..", "userdata");
const PROOF_DIR = path.join(USERDATA_DIR, "applications_proof");
const CSV_PATH = path.join(USERDATA_DIR, "applications_history.csv");
const PROFILE_PATH = path.join(process.cwd(), "lib", "data", "profile.json");
const CV_PATH = path.join(USERDATA_DIR, "cv.pdf");

// Ensure directories exist
if (!fs.existsSync(USERDATA_DIR)) fs.mkdirSync(USERDATA_DIR, { recursive: true });
if (!fs.existsSync(PROOF_DIR)) fs.mkdirSync(PROOF_DIR, { recursive: true });

const MISSION_LOGS_PATH = path.join(USERDATA_DIR, "mission_logs.json");

function logEvent(message: string, action: string = "INFO") {
    const timestamp = new Date().toISOString();
    const logEntry = { timestamp, action, message };
    
    console.log(`[RUNEK] ${new Date().toLocaleTimeString()} - ${message}`);
    
    try {
        let logs = [];
        if (fs.existsSync(MISSION_LOGS_PATH)) {
            logs = JSON.parse(fs.readFileSync(MISSION_LOGS_PATH, "utf-8"));
        }
        logs.unshift(logEntry);
        if (logs.length > 50) logs.pop();
        fs.writeFileSync(MISSION_LOGS_PATH, JSON.stringify(logs, null, 2), "utf-8");
    } catch (e) {
        // Silently fail if log writing fails
    }
}

async function run() {
    logEvent("RUNek Autopilot: Mission Started");

    // Load dynamic profile data
    let profileData: any = {};
    if (fs.existsSync(PROFILE_PATH)) {
        profileData = JSON.parse(fs.readFileSync(PROFILE_PATH, "utf-8"));
    } else {
        logEvent("ERROR: profile.json not found. Please set up your profile in the dashboard first.");
        return;
    }

    if (!fs.existsSync(CV_PATH)) {
        logEvent(`NOTICE: CV not found at ${CV_PATH}. External applications requiring a file upload might fail.`);
    }

    const chromeProfileDir = path.join(USERDATA_DIR, "RunekChromeProfile");
    
    // Launch browser - Playwright will find Chrome automatically if installed
    const context = await chromium.launchPersistentContext(chromeProfileDir, {
        channel: "chrome", // Use installed Chrome
        headless: false,
        viewport: { width: 1280, height: 900 },
        args: [
            "--disable-blink-features=AutomationControlled", 
            "--start-maximized",
            "--no-sandbox"
        ]
    });

    const page = context.pages().length > 0 ? context.pages()[0] : await context.newPage();

    // 1. AUTH GUARD
    logEvent("Phase 1: Verifying Authentication on JustJoinIT...");
    await page.goto("https://justjoin.it/", { waitUntil: "domcontentloaded" });
    
    const loginIndicator = page.locator('button[name="userPanel"], button:has-text("Profile"), a:has-text("Profile"), button:has-text("Profil")').first();
    if (!(await loginIndicator.isVisible({ timeout: 5000 }))) {
        logEvent("!!! NOTICE: Please sign in to JustJoinIT in the opened browser window.");
        await page.waitForSelector('button[name="userPanel"], button:has-text("Profile"), a:has-text("Profile"), button:has-text("Profil")', { timeout: 300000 });
        logEvent("Profile detected. Identity confirmed.");
    }

    // 2. SWEEP
    const searchUrl = `https://justjoin.it/job-offers/all-locations?keyword=${encodeURIComponent(profileData.title || "Product")}&experience-level=junior,mid&orderBy=DESC&sortBy=newest`;
    logEvent(`Phase 2: Navigating to sweep target: ${searchUrl}`);
    await page.goto(searchUrl, { waitUntil: "domcontentloaded" });
    
    // Auto-nuke cookie interception
    await page.evaluate(() => {
        document.querySelectorAll('[id*="cookie" i], [class*="cookie" i], iframe').forEach(e => (e as HTMLElement).style.display = 'none');
        document.body.style.overflow = "auto";
    }).catch(() => null);

    let appliedCount = 0;
    let processedUrls = new Set<string>();
    let noNewJobsStrikes = 0;

    logEvent("Phase 3: Beginning autonomous sweep...");

    while (noNewJobsStrikes < 5) { 
        const cards = page.locator("a.offer-card");
        const count = await cards.count();
        let foundNewJobOnCurrentView = false;

        for (let i = 0; i < count; i++) {
            const card = cards.nth(i);
            const href = await card.getAttribute("href").catch(() => null);
            
            if (!href || processedUrls.has(href)) continue;
            
            processedUrls.add(href);
            foundNewJobOnCurrentView = true;
            noNewJobsStrikes = 0;

            const cardText = await card.textContent().catch(() => "");
            
            if (cardText.includes("Applied") || cardText.includes("Aplikowano")) {
                continue;
            }

            const jobStart = performance.now();
            logEvent(`MISSION [${href.split('/').pop()}]: Starting application sequence...`);
            
            try {
                await card.scrollIntoViewIfNeeded();
                await card.click({ force: true });
                await page.waitForTimeout(2000);

                const applyBtn = page.locator('button:has-text("Apply"), button:has-text("Aplikuj"), button:has-text("Szybka aplikacja")').first();
                
                if (await applyBtn.isVisible()) {
                    const btnText = (await applyBtn.textContent()) || "";
                    if (btnText.includes("1-click") || btnText.includes("Szybka")) {
                        logEvent("  - Action: 1-Click Apply");
                        await applyBtn.click({ force: true });
                        await page.waitForTimeout(2000);

                        const dialog = page.locator('div[role="presentation"], div.MuiDialog-root').first();
                        if (await dialog.isVisible()) {
                            const cbs = await dialog.locator('input[type="checkbox"]').all();
                            for (const cb of cbs) { try { await cb.check({ force: true }); } catch(e){} }
                            
                            const submit = dialog.locator('button:has-text("Apply"), button:has-text("Aplikuj"), button[type="submit"]').first();
                            await submit.click({ force: true });
                            await page.waitForTimeout(3000);

                            if (!(await submit.isVisible())) {
                                logEvent(`SUCCESS: Applied to ${href.split('/').pop()}`, "APPLIED");
                                appliedCount++;
                                fs.appendFileSync(CSV_PATH, `"${new Date().toISOString()}","${href}","1-Click","Success"\n`);
                            }
                        }
                    } else {
                        logEvent("  - Action: External ATS (Filling forms...)");
                        const [newPage] = await Promise.all([
                            context.waitForEvent('page'),
                            applyBtn.click({ force: true })
                        ]);
                        await newPage.waitForLoadState('networkidle');
                        
                        await newPage.evaluate((data) => {
                            const findInput = (terms: string[]) => {
                                for (const t of terms) {
                                    const xpath = `//label[contains(translate(text(), 'AZ', 'az'), "${t}")]//following::input[1] | //input[contains(@placeholder, "${t}")] | //input[contains(@name, "${t}")]`;
                                    const field = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                                    if (field) return field as HTMLInputElement;
                                }
                                return null;
                            };
                            
                            const fields = {
                                'name': data.name,
                                'email': data.email || "",
                                'phone': data.phone || "",
                                'linkedin': data.linkedin || ""
                            };
                            Object.entries(fields).forEach(([term, val]) => {
                                const f = findInput([term]);
                                if (f) f.value = val;
                            });
                        }, profileData).catch(() => null);
                        
                        if (fs.existsSync(CV_PATH)) {
                            try {
                                const fileIn = await newPage.$('input[type="file"]');
                                if (fileIn) await fileIn.setInputFiles(CV_PATH);
                            } catch(e){}
                        }

                        logEvent("  - Action: Form filled. Please review and click SUBMIT manually.");
                        await newPage.waitForTimeout(10000);
                        await newPage.close();
                        
                        appliedCount++;
                        fs.appendFileSync(CSV_PATH, `"${new Date().toISOString()}","${href}","External","Handled"\n`);
                    }
                }
            } catch (err: any) {
                logEvent(`  - Outcome: EXCEPTION. ${err.message}`);
            }

            await page.keyboard.press('Escape');
            await page.waitForTimeout(1000);
        }

        if (!foundNewJobOnCurrentView) {
            await page.keyboard.press('PageDown');
            await page.waitForTimeout(2000);
            noNewJobsStrikes++;
        }
    }

    logEvent(`Mission Finished. Processed ${appliedCount} jobs.`);
    await page.waitForTimeout(30000);
    await context.close();
}

run().catch(console.error);
