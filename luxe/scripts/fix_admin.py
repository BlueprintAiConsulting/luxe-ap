import re

def fix_admin_ts():
    # Fix dispatch/page.tsx
    with open('src/app/(admin)/dispatch/page.tsx', 'r') as f:
        d_content = f.read()
    
    d_content = d_content.replace('title={trip.pickup.line1}', 'title={trip.pickup.line1 || undefined}')
    d_content = d_content.replace('{trip.pickup.line1}', '{trip.pickup.line1 || ""}')
    d_content = d_content.replace('{trip.dropoff.line1}', '{trip.dropoff.line1 || ""}')

    with open('src/app/(admin)/dispatch/page.tsx', 'w') as f:
        f.write(d_content)
        
    # Fix pricing/page.tsx
    with open('src/app/(admin)/pricing/page.tsx', 'r') as f:
        p_content = f.read()

    p_content = p_content.replace("import { formatDateTime } from '@/lib/format';", "import { formatDateTime, formatMoney } from '@/lib/format';")
    
    # State updates
    p_content = p_content.replace(
        "setRuleSet({ ...ruleSet, holidays: newHolidays });",
        "setRuleSet({ ...ruleSet, surcharges: { ...ruleSet.surcharges, holidays: newHolidays } });"
    )
    
    # In some places they might do:
    # const h = [...ruleSet.holidays] -> const h = [...ruleSet.surcharges.holidays]
    p_content = p_content.replace("ruleSet.holidays", "ruleSet.surcharges.holidays")
    
    # multiplier -> percent
    p_content = p_content.replace("h.multiplier =", "h.percent =")
    p_content = p_content.replace("multiplier:", "percent:")
    p_content = p_content.replace("multiplier: 1.5", "percent: 1.5")
    
    # hoursBefore -> hoursBeforePickup
    p_content = p_content.replace("w.hoursBefore", "w.hoursBeforePickup")
    p_content = p_content.replace("hoursBefore:", "hoursBeforePickup:")

    # cancellationWindows -> cancellation
    p_content = p_content.replace("cancellationWindows:", "cancellation:")
    p_content = p_content.replace("cancellationWindows.", "cancellation.")
    p_content = p_content.replace("ruleSet.cancellationWindows", "ruleSet.cancellation")
    
    with open('src/app/(admin)/pricing/page.tsx', 'w') as f:
        f.write(p_content)

fix_admin_ts()
