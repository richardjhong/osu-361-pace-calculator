const express = require("express");
const axios = require("axios");

const app = express();
const PORT = process.env.PORT || 3001;
const WEEK_PARSER_URL =
  process.env.WEEK_PARSER_URL || "https://osu-361-week-parser.onrender.com";

app.use(express.json());

/**
 * GET /pace?remaining=X&total=Y
 * Calculates pace needed to finish remaining items before the week ends.
 */
app.get("/pace", async (req, res) => {
  const remaining = parseFloat(req.query.remaining);
  const total = parseFloat(req.query.total);

  if (
    isNaN(remaining) ||
    isNaN(total) ||
    remaining < 0 ||
    total <= 0 ||
    remaining > total
  ) {
    return res.status(400).json({
      error:
        "Invalid input. remaining and total must be positive numbers, and remaining must be less than or equal to total.",
    });
  }

  try {
    const response = await axios.get(WEEK_PARSER_URL, { timeout: 60000 });
    const daysRemainingInWeek = response.data?.daysRemainingInWeek;

    if (daysRemainingInWeek === undefined || daysRemainingInWeek === null) {
      return res.status(500).json({
        error: "Week parser service did not return daysRemainingInWeek.",
      });
    }

    const originalPace = Math.ceil(total / 7);

    // Edge case: last day of the week
    if (daysRemainingInWeek === 0) {
      if (remaining === 0) {
        return res.json({
          remaining,
          total,
          daysRemainingInWeek,
          originalPace,
          paceToMaintain: 0,
          status: "complete",
          compensation: null,
        });
      }
      return res.json({
        remaining,
        total,
        daysRemainingInWeek,
        originalPace,
        paceToMaintain: "N/A",
        status: "behind",
        compensation: {
          message: `The week ends today and you still have ${remaining} item(s) remaining. You must complete all ${remaining} remaining item(s) today to finish.`,
          requiredPace: remaining,
          extraPerDay: "N/A",
        },
      });
    }

    const requiredPace = Math.ceil(remaining / daysRemainingInWeek);

    let status;
    let compensation = null;

    switch (Math.sign(requiredPace - originalPace)) {
      case 1:
        status = "behind";
        const extraPerDay = requiredPace - originalPace;
        compensation = {
          message: `You are behind schedule. To finish on time, complete ${requiredPace} items/day for the remaining ${daysRemainingInWeek} day(s). This is ${extraPerDay} more than your originally planned pace of ${originalPace} items/day.`,
          requiredPace,
          extraPerDay,
        };
        break;
      case -1:
        status = "ahead";
        const slackPerDay = originalPace - requiredPace;
        compensation = {
          message: `You are ahead of schedule! You only need to complete ${requiredPace} items/day for the remaining ${daysRemainingInWeek} day(s), which is ${slackPerDay} less than your originally planned pace of ${originalPace} items/day.`,
          requiredPace,
          slackPerDay,
        };
        break;
      case 0:
      default:
        status = "on track";
        compensation = {
          message: `You are exactly on track. Continue completing ${originalPace} items/day for the remaining ${daysRemainingInWeek} day(s).`,
          requiredPace: originalPace,
          extraPerDay: 0,
        };
    }

    res.json({
      remaining,
      total,
      daysRemainingInWeek,
      originalPace,
      paceToMaintain: requiredPace,
      status,
      compensation,
    });
  } catch (error) {
    console.error("Error fetching week parser data:", error.message);
    res.status(500).json({
      error: "Failed to fetch data from week parser service.",
      details: error.message,
    });
  }
});

app.listen(PORT, () => {
  console.log(`Pace calculator microservice running on port ${PORT}`);
});
