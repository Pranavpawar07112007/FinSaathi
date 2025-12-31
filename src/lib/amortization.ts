export interface AmortizationPayment {
  month: number;
  principal: number;
  interest: number;
  totalPayment: number;
  remainingBalance: number;
}

export function calculateAmortizationSchedule(
  principal: number,
  annualInterestRate: number,
  monthlyPayment: number
): AmortizationPayment[] {
  if (principal <= 0 || annualInterestRate < 0 || monthlyPayment <= 0) {
    return [];
  }

  const monthlyInterestRate = annualInterestRate / 100 / 12;
  
  // Check if payment is sufficient to cover first month's interest
  if (monthlyPayment <= principal * monthlyInterestRate) {
      // Payment is too low, loan will never be paid off.
      return [];
  }

  const schedule: AmortizationPayment[] = [];
  let remainingBalance = principal;
  let month = 1;

  while (remainingBalance > 0 && month <= 480) { // Cap at 40 years to prevent infinite loops
    const interestPayment = remainingBalance * monthlyInterestRate;
    let principalPayment = monthlyPayment - interestPayment;

    if (remainingBalance < monthlyPayment) {
        principalPayment = remainingBalance;
        monthlyPayment = remainingBalance + interestPayment;
    }
    
    remainingBalance -= principalPayment;
    
    // Ensure remaining balance doesn't go negative due to floating point inaccuracies
    if(remainingBalance < 0) {
        principalPayment += remainingBalance; // Adjust final principal payment
        remainingBalance = 0;
    }


    schedule.push({
      month,
      principal: principalPayment,
      interest: interestPayment,
      totalPayment: monthlyPayment,
      remainingBalance,
    });

    month++;
  }

  return schedule;
}
