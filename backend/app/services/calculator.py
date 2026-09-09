"""
Standard reducing-balance EMI math, extended to account for a moratorium
period. ASSUMPTION (flagged per project rule "state assumptions clearly
rather than inventing policy"): interest accrues during the moratorium
and is added to principal before EMI is calculated on the post-moratorium
tenure — this mirrors NBCFDC's own description of moratorium as a
repayment deferral, not an interest-free period. If your team confirms
NBCFDC schemes are actually interest-free during moratorium, flip
ACCRUE_INTEREST_DURING_MORATORIUM to False.
"""

ACCRUE_INTEREST_DURING_MORATORIUM = True


def calculate_emi(
    principal: float,
    annual_interest_rate: float,
    tenure_months: int,
    moratorium_months: int = 0,
) -> dict:
    monthly_rate = annual_interest_rate / 12 / 100

    effective_principal = principal
    if moratorium_months > 0 and ACCRUE_INTEREST_DURING_MORATORIUM and monthly_rate > 0:
        effective_principal = principal * ((1 + monthly_rate) ** moratorium_months)

    repayment_months = max(tenure_months - moratorium_months, 1)

    if monthly_rate == 0:
        emi = effective_principal / repayment_months
    else:
        emi = (
            effective_principal
            * monthly_rate
            * (1 + monthly_rate) ** repayment_months
        ) / (((1 + monthly_rate) ** repayment_months) - 1)

    total_repayment = emi * repayment_months
    total_interest = total_repayment - principal

    return {
        "monthly_emi": round(emi, 2),
        "total_interest": round(total_interest, 2),
        "total_repayment": round(total_repayment, 2),
        "moratorium_months": moratorium_months,
        "repayment_start_month": moratorium_months + 1,
        "repayment_months": repayment_months,
        "effective_principal_after_moratorium": round(effective_principal, 2),
        "assumption_note": (
            "Interest accrues during moratorium and is added to principal "
            "before EMI calculation (verify against NBCFDC's exact policy "
            "before final submission)."
            if moratorium_months > 0
            else None
        ),
    }
