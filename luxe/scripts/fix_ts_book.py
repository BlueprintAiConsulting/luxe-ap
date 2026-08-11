import re

def update_book_page():
    with open('src/app/(rider)/book/page.tsx', 'r') as f:
        content = f.read()

    # Import Timestamp
    content = content.replace(
        'import { doc, getDoc, getDocs, collection, query, where } from "firebase/firestore";',
        'import { doc, getDoc, getDocs, collection, query, where, Timestamp } from "firebase/firestore";'
    )

    # Change toISOString() to Timestamp.fromDate()
    content = content.replace('pickupAt: pDate.toISOString(),', 'pickupAt: Timestamp.fromDate(pDate) as any,')

    # Fix airportCode type issue in quote inputs (from undefined to null)
    # The error was: Type 'string | undefined' is not assignable to type 'string | null'.
    content = content.replace(
        'airportCode: tripType.includes("airport") ? (pickupAddressObj?.airportCode || dropoffAddressObj?.airportCode || undefined) : undefined,',
        'airportCode: tripType.includes("airport") ? (pickupAddressObj?.airportCode || dropoffAddressObj?.airportCode || null) : null,'
    )

    with open('src/app/(rider)/book/page.tsx', 'w') as f:
        f.write(content)

update_book_page()
