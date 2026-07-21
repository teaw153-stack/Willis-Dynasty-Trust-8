from fastapi import FastAPI, Request, Header, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import stripe
import os
from supabase import create_client
from typing import Optional
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="More Simple Tax API")

@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    import traceback
    return JSONResponse(status_code=500, content={"error": str(exc), "type": type(exc).__name__})

app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

stripe.api_key = os.getenv("STRIPE_SECRET_KEY")

# ── Supabase client — resilient to env mismapping of SUPABASE_URL ─────────────
# SUPABASE_URL sometimes gets set to the anon key value by auto-detection.
# Fall back to hardcoded project URL if the env value isn't a real https:// URL.
_SUPABASE_PROJECT_URL = "https://qlklyrvcdqbomnijpswe.supabase.co"
_supabase_url = os.getenv("SUPABASE_URL", _SUPABASE_PROJECT_URL)
if not _supabase_url.startswith("https://"):
    _supabase_url = _SUPABASE_PROJECT_URL
_supabase_key = (
    os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    or os.getenv("SUPABASE_ANON_KEY")
    or os.getenv("SUPABASE_KEY")
)
supabase = create_client(_supabase_url, _supabase_key)

# ── Stripe price → tier mapping (single source of truth) ──────────────────────
TIER_PRICE_MAP = {
    "basic":   "price_1TrMEl50gp2MIkKCSmiWMhx7",
    "pro":     "price_1TrMEp50gp2MIkKCQfe8I6HL",
    "premium": "price_1TrMEs50gp2MIkKCiGoRb1za",
}
PRICE_TIER_MAP = {v: k for k, v in TIER_PRICE_MAP.items()}  # reverse lookup for webhook


# ===== MODELS =====

class ScorpInput(BaseModel):
    net_profit: float
    reasonable_salary: float
    state: Optional[str] = "CA"

class Solo401kInput(BaseModel):
    entity_type: str
    age: int
    net_profit: float
    se_tax: float

class QBIInput(BaseModel):
    qbi_income: float
    taxable_income: float
    filing_status: str
    is_sstb: bool

class HomeOfficeInput(BaseModel):
    office_sqft: float
    home_sqft: float
    annual_home_expenses: float

class VehicleInput(BaseModel):
    business_miles: float
    total_miles: float
    actual_expenses: Optional[float] = 0

class HSAInput(BaseModel):
    filing_status: str          # single | family
    age: int
    marginal_rate: float

class HireKidsInput(BaseModel):
    child_wages: float
    num_children: int
    parent_marginal_rate: float

class AugustaInput(BaseModel):
    days_rented: int
    fair_market_daily_rate: float
    marginal_rate: float

class AccountablePlanInput(BaseModel):
    monthly_reimbursements: float
    marginal_rate: float

class TaxLossInput(BaseModel):
    loss_amount: float
    marginal_rate: float
    state_rate: Optional[float] = 0.093  # CA default


# ===== HEALTH =====

@app.get("/")
def root():
    return {"status": "ok", "app": "More Simple Tax API"}


# ===== CALCULATORS =====

@app.post("/calc/scorp")
def calc_scorp(data: ScorpInput):
    se_tax_before = data.net_profit * 0.153
    se_tax_after  = data.reasonable_salary * 0.153
    estimated_net_savings = (se_tax_before - se_tax_after) - 1200
    return {
        "reasonable_salary":     data.reasonable_salary,
        "distributions":         round(data.net_profit - data.reasonable_salary),
        "se_tax_before":         round(se_tax_before),
        "se_tax_after":          round(se_tax_after),
        "estimated_net_savings": round(estimated_net_savings),
    }


@app.post("/calc/solo401k")
def calc_solo401k(data: Solo401kInput):
    employee_limit   = 31000 if data.age >= 50 else 23500
    employee_contrib = min(employee_limit, data.net_profit)
    employer_contrib = max(0, (data.net_profit - data.se_tax) * 0.20)
    total            = min(70000, employee_contrib + employer_contrib)
    return {
        "employee_contrib":    round(employee_contrib),
        "employer_contrib":    round(employer_contrib),
        "total_contribution":  round(total),
        "estimated_tax_saved": round(total * 0.24),
    }


@app.post("/calc/qbi")
def calc_qbi(data: QBIInput):
    threshold = 197300 if data.filing_status == "single" else 394600
    if data.taxable_income > threshold and data.is_sstb:
        phase_out_range = 50000 if data.filing_status == "single" else 100000
        phase_out = min(1.0, (data.taxable_income - threshold) / phase_out_range)
        deduction = data.qbi_income * 0.20 * (1 - phase_out)
    else:
        deduction = data.qbi_income * 0.20
    return {
        "qbi_deduction":       round(deduction),
        "estimated_tax_saved": round(deduction * 0.24),
    }


@app.post("/calc/home_office")
def calc_home_office(data: HomeOfficeInput):
    pct        = min(data.office_sqft / data.home_sqft, 1.0)
    actual     = data.annual_home_expenses * pct
    simplified = min(data.office_sqft, 300) * 5
    best       = max(actual, simplified)
    return {
        "actual_method_deduction":     round(actual),
        "simplified_method_deduction": round(simplified),
        "recommended_deduction":       round(best),
        "estimated_tax_saved":         round(best * 0.24),
    }


@app.post("/calc/vehicle")
def calc_vehicle(data: VehicleInput):
    mileage_rate    = 0.70  # 2026 IRS standard rate estimate
    business_pct    = data.business_miles / max(data.total_miles, 1)
    standard_method = data.business_miles * mileage_rate
    actual_method   = data.actual_expenses * business_pct
    best            = max(standard_method, actual_method)
    return {
        "standard_method":     round(standard_method),
        "actual_method":       round(actual_method),
        "recommended":         round(best),
        "estimated_tax_saved": round(best * 0.24),
    }


@app.post("/calc/hsa")
def calc_hsa(data: HSAInput):
    limit = 4300 if data.filing_status == "single" else 8550
    if data.age >= 55:
        limit += 1000
    return {
        "max_contribution":    limit,
        "estimated_tax_saved": round(limit * data.marginal_rate),
    }


@app.post("/calc/hire_kids")
def calc_hire_kids(data: HireKidsInput):
    standard_deduction = 14600
    total_wages    = data.child_wages * data.num_children
    taxable_wages  = max(0, data.child_wages - standard_deduction) * data.num_children
    parent_savings = total_wages * data.parent_marginal_rate
    child_tax      = taxable_wages * 0.10
    return {
        "total_wages":        round(total_wages),
        "parent_tax_saved":   round(parent_savings),
        "child_tax_owed":     round(child_tax),
        "net_family_savings": round(parent_savings - child_tax),
    }


@app.post("/calc/augusta")
def calc_augusta(data: AugustaInput):
    if data.days_rented > 14:
        return JSONResponse(status_code=400, content={"error": "Augusta Rule only applies to ≤14 days/year."})
    deduction = data.days_rented * data.fair_market_daily_rate
    return {
        "deduction":           round(deduction),
        "estimated_tax_saved": round(deduction * data.marginal_rate),
    }


@app.post("/calc/accountable_plan")
def calc_accountable_plan(data: AccountablePlanInput):
    annual = data.monthly_reimbursements * 12
    return {
        "annual_reimbursements": round(annual),
        "estimated_tax_saved":   round(annual * data.marginal_rate),
    }


@app.post("/calc/tax_loss")
def calc_tax_loss(data: TaxLossInput):
    federal = data.loss_amount * data.marginal_rate
    state   = data.loss_amount * data.state_rate
    return {
        "federal_tax_saved": round(federal),
        "state_tax_saved":   round(state),
        "total_tax_saved":   round(federal + state),
    }


# ===== STRIPE WEBHOOK =====

@app.post("/webhook/stripe")
async def stripe_webhook(request: Request, stripe_signature: str = Header(None)):
    payload = await request.body()
    try:
        event = stripe.Webhook.construct_event(
            payload, stripe_signature, os.getenv("STRIPE_WEBHOOK_SECRET")
        )
    except Exception:
        raise HTTPException(400, "Invalid signature")

    if event["type"] == "checkout.session.completed":
        session = event["data"]["object"]
        user_id = session.get("client_reference_id")
        if not user_id:
            return {"status": "skipped: no client_reference_id"}

        sub      = stripe.Subscription.retrieve(session["subscription"])
        price_id = sub["items"]["data"][0]["price"]["id"]
        tier     = PRICE_TIER_MAP.get(price_id, "basic")

        supabase.table("profiles").update({
            "subscription_tier":   tier,
            "subscription_status": "active",
            "stripe_customer_id":  session["customer"],
        }).eq("id", user_id).execute()

    elif event["type"] == "customer.subscription.deleted":
        sub = event["data"]["object"]
        supabase.table("profiles").update({
            "subscription_status": "canceled",
            "subscription_tier":   "free",
        }).eq("stripe_customer_id", sub["customer"]).execute()

    return {"status": "success"}


# ===== STRIPE CHECKOUT & PORTAL =====

@app.post("/stripe/checkout")
async def create_checkout_session(data: dict):
    tier     = data.get("tier", "basic")
    user_id  = data.get("user_id")
    price_id = TIER_PRICE_MAP.get(tier)

    if not price_id:
        return JSONResponse(status_code=400, content={"error": f"Unknown tier: {tier}"})
    if not user_id:
        return JSONResponse(status_code=400, content={"error": "user_id is required"})

    try:
        session = stripe.checkout.Session.create(
            mode="subscription",
            line_items=[{"price": price_id, "quantity": 1}],
            subscription_data={"trial_period_days": 7},
            client_reference_id=user_id,
            success_url=data.get("success_url", "https://moresimple.tax/success"),
            cancel_url=data.get("cancel_url",   "https://moresimple.tax/pricing"),
        )
        return {"url": session.url}
    except stripe.error.StripeError as e:
        return JSONResponse(status_code=502, content={"error": str(e), "type": "stripe_error"})
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e), "type": type(e).__name__})


@app.post("/stripe/portal")
async def create_portal_session(data: dict):
    session = stripe.billing_portal.Session.create(
        customer=data.get("customer_id"),
        return_url="moresimpletax://profile",
    )
    return {"url": session.url}

