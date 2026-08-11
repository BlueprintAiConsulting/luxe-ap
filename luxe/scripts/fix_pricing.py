import re

def fix_pricing():
    with open('src/app/(admin)/pricing/page.tsx', 'r') as f:
        content = f.read()

    # Add formatMoney import
    content = content.replace("import { Loader2, Plus, Trash2, Edit2, CheckCircle2 } from 'lucide-react';", "import { Loader2, Plus, Trash2, Edit2, CheckCircle2 } from 'lucide-react';\nimport { formatMoney } from '@/lib/format';")

    # Fix holidays updates
    content = content.replace(
        "setRuleSet({...ruleSet, holidays: hols});",
        "setRuleSet({...ruleSet, surcharges: { ...ruleSet.surcharges, holidays: hols } });"
    )

    content = content.replace(
        "setRuleSet({...ruleSet, holidays: [...ruleSet.surcharges.holidays, {date: '', name: '', percent: 1.5}]})",
        "setRuleSet({...ruleSet, surcharges: { ...ruleSet.surcharges, holidays: [...ruleSet.surcharges.holidays, {date: '', name: '', percent: 1.5, flatCents: 0}] } })"
    )

    # Fix cancellation Windows updates
    content = content.replace("cws[i].hoursBefore = parseInt(e.target.value);", "cws[i].hoursBeforePickup = parseInt(e.target.value);")
    
    content = content.replace(
        "cancellation: [...ruleSet.cancellation, {hoursBeforePickup: 24, feePercent: 50}]",
        "cancellation: [...ruleSet.cancellation, {hoursBeforePickup: 24, feePercent: 50, feeFlatCents: 0, appliesToClasses: \"all\"}]"
    )

    with open('src/app/(admin)/pricing/page.tsx', 'w') as f:
        f.write(content)

fix_pricing()
