import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const TICKET_ID = 110;

const customerReplies = [
  `Hi there, I'm reaching out because I've been having a really frustrating experience
with the course platform over the past few days. Every time I try to access
the "Advanced React Patterns" module, the video player just shows a black screen.
I've tried refreshing the page multiple times, clearing my browser cache,
and even switching to a different browser, but nothing seems to work.
This is really disappointing because I was making great progress through
the course and this issue has completely halted my learning.
I'm currently using Chrome on Windows 11, and my internet connection
is stable — I can stream videos on other platforms without any issues.
Could you please look into this as soon as possible?
I'd really appreciate any help you can provide.`,

  `Thank you for the quick response! I really appreciate you looking into this.
I went ahead and tried the steps you suggested. I disabled all my browser
extensions, cleared the cache completely, and restarted Chrome.
Unfortunately, the issue is still persisting. The video player loads
the controls and the progress bar, but the actual video content
remains completely black. I also noticed that the video thumbnail
shows correctly on the course overview page, so it seems like
the video files themselves might be fine.
One thing I forgot to mention earlier — this issue started happening
right after the platform update that rolled out last Tuesday.
Before that update, everything was working perfectly fine.
Could this be related to some change in the video player component?`,

  `I just tried Firefox as you suggested, and interestingly the videos
do play there, but the quality is noticeably lower and there's
a significant buffering delay that makes it hard to follow along.
The playback keeps pausing every 10-15 seconds to buffer more content,
even though my connection speed is well above the recommended minimum.
I ran a speed test and I'm getting 150 Mbps down and 50 Mbps up,
so bandwidth definitely shouldn't be an issue here.
Also, I noticed that in Firefox, the video player UI looks different
from what I remember — the controls are positioned differently
and the fullscreen mode doesn't seem to work properly.
Is there a known compatibility issue with the latest Firefox version?
I'm on Firefox 128.0.3 if that helps with troubleshooting.`,

  `Sure, I'd be happy to provide more details about my setup.
My operating system is Windows 11 Pro, version 23H2, build 22631.
My display resolution is 2560x1440 at 144Hz refresh rate.
I have a dedicated NVIDIA RTX 3070 graphics card with the latest
driver version 551.86 installed. Hardware acceleration is enabled
in Chrome, which I know can sometimes cause issues with video playback.
I also have an ad blocker (uBlock Origin) and a password manager
extension installed, but I did try disabling both of them as you
suggested earlier and the problem persisted.
My Chrome version is 124.0.6367.91 — I just checked and it says
it's up to date. Let me know if you need any other information
from my end. I'm really hoping we can get this resolved soon
because I have a project deadline coming up next week.`,

  `That's really helpful to know — thank you for explaining the root cause!
I went ahead and disabled hardware acceleration in Chrome as you suggested,
and I can confirm that the videos are now playing correctly.
The black screen issue is completely gone, which is a huge relief.
However, I did notice that with hardware acceleration disabled,
the overall browser performance feels a bit sluggish, especially
when I have multiple tabs open. Scrolling through the course material
isn't as smooth as it used to be, and some of the interactive
code examples in the exercises seem to render more slowly.
Is this expected? And more importantly, is the team planning
to release a fix so that hardware acceleration can work alongside
the video player without causing the black screen issue?
I'd prefer not to keep hardware acceleration disabled permanently.`,

  `That's great news! I'm glad to hear the team is already working on a fix.
The timeline of one to two weeks sounds reasonable. In the meantime,
I'll keep hardware acceleration disabled as a workaround.
I do have a follow-up question though — while I was troubleshooting
this issue, I noticed that some of the downloadable resources
for the React course are also not working. Specifically, the
exercise files for chapters 7 through 12 give me a 404 error
when I click the download link. I'm not sure if this is related
to the same platform update or if it's a separate issue entirely.
Should I create a new ticket for this, or can you look into it
as part of this conversation? I've attached a screenshot of the
error page in case that helps. It shows the exact URL that's
returning the 404 and the timestamp of when I tried accessing it.`,

  `Perfect, I appreciate you handling both issues in one ticket.
I just checked the download links again and the ones for chapters
1 through 6 are working fine — I was able to download all of those
without any problems. It's specifically chapters 7 through 12
that are broken. The URLs for the working chapters follow the pattern
/downloads/react-course/ch01-exercises.zip, but when I look at the
broken links, they seem to have a slightly different URL structure:
/downloads/react-course/v2/ch07-exercises.zip. Notice the extra
"v2" in the path. I'm wondering if the resources were moved to
a new location during the platform update but the links in the
course page weren't updated to reflect the new paths.
I hope this information helps narrow down the issue!
Let me know if you need me to test anything else.`,

  `Awesome, the download links are all working now! I just went through
and downloaded every exercise file from chapters 7 through 12
and they all came through without any issues. Thank you so much
for the quick turnaround on that fix.
Now I'm back on track with the course, but I wanted to mention
one more thing. While I was catching up on the modules I missed,
I noticed that the code editor in the interactive exercises has
a new feature where it auto-saves your work. This is really nice,
but I found that it seems to overwrite the original starter code
even when you reset the exercise. So if I make changes, then click
"Reset Exercise," it loads my auto-saved version instead of the
original template code. This kind of defeats the purpose of the
reset button. Is this a known issue or am I misunderstanding
how the reset feature is supposed to work?`,

  `I just tested it again following your instructions exactly.
Here's what I did step by step: I opened the exercise for chapter 9,
lesson 3. I modified the starter code by adding a useEffect hook.
I waited about 30 seconds to make sure the auto-save triggered.
Then I clicked the "Reset Exercise" button at the top right corner.
The editor briefly flashed, but then it showed my modified code
with the useEffect hook still there, not the original starter code.
I tried this three more times with the same result each time.
Then I opened a completely different exercise (chapter 10, lesson 1)
and that one reset correctly because I hadn't modified it before.
So it definitely seems like the auto-save is interfering with
the reset functionality. I cleared my browser's local storage
for the site, and after that the reset worked correctly again,
but the auto-save data for all my other exercises was lost too.`,

  `That makes total sense — storing the auto-save and the starter code
separately would definitely solve the problem. I appreciate you
explaining the technical details of how it works behind the scenes.
While we're on the topic of the interactive exercises, I have
one more piece of feedback. The console output panel at the bottom
of the code editor is really useful for debugging, but the font
size is quite small and there doesn't seem to be a way to resize it.
For someone who spends hours working through exercises, it would be
really nice to either have a larger default font size or the ability
to drag the panel border to make it bigger. I know this is more
of a feature request than a bug, but I thought I'd mention it
while we're already discussing the exercise environment.
Also, is there a way to change the editor theme to dark mode?
I've been looking for a setting but couldn't find one.`,
];

const agentReplies = [
  `Hi! Thank you so much for reaching out to us about this issue.
I'm sorry to hear you're experiencing trouble with the video player —
I completely understand how frustrating that must be, especially
when you're in the middle of making progress through the course.
Let me help you troubleshoot this step by step.
First, could you try disabling all browser extensions temporarily?
Sometimes extensions like ad blockers or privacy tools can interfere
with our video player's functionality. To do this, go to Chrome's
menu, click "Extensions," and toggle off all of them.
After that, please try loading the video again.
If that doesn't work, try opening the course in an incognito window
(Ctrl+Shift+N in Chrome) to see if the issue persists there.
This will help us determine if the problem is related to cached
data or extensions. Please let me know what you find!`,

  `Thank you for trying those steps and for the additional detail
about the timing — that's actually very helpful information!
You're right to suspect that the recent platform update could
be related. We did roll out some changes to our video streaming
infrastructure last Tuesday, and your report matches a pattern
we've been seeing from a small number of users.
The issue appears to be related to how our updated video player
interacts with certain browser configurations.
Could you try one more thing for me? Please open the affected
video page, then press F12 to open Chrome's Developer Tools.
Click on the "Console" tab and let me know if you see any
error messages highlighted in red. Specifically, I'm looking
for errors that mention "MediaSource" or "codec."
Also, could you try accessing the videos in Firefox to see
if the issue is Chrome-specific? This will help us narrow down
the root cause significantly.`,

  `That's very interesting — the fact that it works in Firefox
(even with performance issues) but not in Chrome strongly suggests
this is related to a Chrome-specific video codec handling change.
The buffering issues you're experiencing in Firefox are likely
because our player is falling back to a less optimized streaming
protocol when it can't use the preferred one.
I've escalated this to our engineering team with all the details
you've provided. They're already investigating the Chrome compatibility
issue that came with the last update.
In the meantime, could you provide me with a few more details
about your system? Specifically, your operating system version,
display resolution, whether you have a dedicated graphics card,
and whether hardware acceleration is enabled in Chrome.
You can check the hardware acceleration setting by going to
chrome://settings, searching for "hardware acceleration,"
and letting me know if it's turned on or off.
These details will help our engineers reproduce the issue.`,

  `Thank you for providing such thorough details about your setup!
I shared all of this information with our engineering team, and
they've been able to reproduce the issue on a similar configuration.
The root cause has been identified — it's a conflict between our
updated video player's hardware-accelerated rendering pipeline
and certain NVIDIA driver versions when running at high refresh
rates (above 60Hz). The combination of your 144Hz display and
the RTX 3070 with the latest drivers triggers a rendering bug
in Chrome's compositor that results in the black screen you're seeing.
As an immediate workaround, could you try disabling hardware
acceleration in Chrome? Go to chrome://settings, search for
"Use hardware acceleration when available," and toggle it off.
Then restart Chrome completely and try playing the video again.
Our team is working on a patch for the video player that will
resolve this conflict. I expect the fix to be deployed within
the next one to two weeks. I'll make sure to update you
when the fix is live so you can re-enable hardware acceleration.`,

  `I'm really glad to hear that the workaround resolved the black
screen issue! And yes, you're absolutely right that disabling
hardware acceleration can affect overall browser performance —
that's a known trade-off, especially on systems with powerful
dedicated GPUs like yours where Chrome offloads a lot of
rendering work to the graphics card.
To answer your questions: yes, the slight sluggishness with
multiple tabs and the slower rendering of interactive elements
is expected when hardware acceleration is disabled. Chrome has
to fall back to software rendering for everything, which puts
more load on your CPU instead of leveraging the GPU.
Regarding the fix timeline — our engineering team has already
identified the exact issue in the video player code and they're
currently testing a patch. The estimated deployment is within
one to two weeks. Once it's live, you'll be able to re-enable
hardware acceleration and everything should work perfectly.
I'll personally follow up with you once the fix is deployed.
In the meantime, please don't hesitate to reach out if you
experience any other issues!`,

  `Of course! I'd be happy to look into the download issue as well —
no need to create a separate ticket. Let me check on those
exercise files for chapters 7 through 12 right away.
I've just checked our content management system and I can see
the issue. You're absolutely right that the files were moved
during the platform update. The exercise files for the newer
chapters were migrated to a new storage location as part of
our infrastructure upgrade, but it looks like the download links
in the course page weren't properly updated to point to the
new location. This is definitely a bug on our end.
I'm going to flag this for our content team right now so they
can update the links. In the meantime, could you confirm exactly
which chapter exercise files are affected? You mentioned chapters
7 through 12, but I want to make sure I report the complete
list. Also, are the video resources and supplementary PDFs
downloading correctly, or are those affected too?
Thank you for your patience while we sort this out!`,

  `Great detective work on the URL structure difference! You're
absolutely spot on — the "v2" path segment is from our new
content delivery system, and the course page links weren't
updated after the migration. I've reported this to our content
team with the specific URL pattern details you provided.
I'm happy to report that the fix has already been deployed!
Our content team was able to push an update to correct all the
download links for the React course within the last hour.
Could you please try downloading the exercise files for chapters
7 through 12 again and let me know if they're all working now?
If any of them are still broken, please let me know the specific
chapter and lesson number and I'll escalate it immediately.
Also, I wanted to give you a quick update on the video player
fix — our engineering team completed their testing yesterday
and the patch is scheduled for deployment early next week.
Once it's out, you should be able to re-enable hardware
acceleration in Chrome without any issues.
Thank you for your patience throughout all of this!`,

  `Wonderful — I'm glad all the download links are working now!
Regarding the auto-save and reset issue you've discovered,
that's a really good catch. Let me explain what's happening.
The auto-save feature was introduced in the latest update to
prevent users from losing their work if they accidentally close
the browser or navigate away from the page. It saves your code
to the browser's local storage every 30 seconds.
The problem is that the reset function is currently looking at
local storage first before falling back to the original template.
So when you click "Reset Exercise," it finds your auto-saved
version and loads that instead of the original starter code.
This is definitely a bug — the reset button should always restore
the original template code regardless of any auto-saved versions.
Could you try one more test for me? When you click "Reset Exercise,"
do you see a confirmation dialog asking you to confirm the reset,
or does it just immediately reload? This will help me understand
which version of the reset logic your session is using.`,

  `Thank you for the detailed reproduction steps — that's exactly
the kind of information our developers need to fix this efficiently!
I've filed a bug report with your step-by-step reproduction case
and the observation that clearing local storage resolves it
(but with the side effect of losing all auto-save data).
The fix for this will involve storing the auto-saved code and
the original starter code in separate local storage keys.
That way, the reset function can always retrieve the original
template without being affected by the auto-save feature.
Our development team has added this to the current sprint,
so you should see a fix within the next week or two.
In the meantime, if you need to reset an exercise, you can
use this workaround: open Chrome DevTools (F12), go to the
Application tab, expand Local Storage on the left, find the
entry for our domain, and look for the key that starts with
"exercise-autosave-" followed by the exercise ID. Delete just
that one entry and then refresh the page. This will reset
that specific exercise without affecting your other saved work.
I know it's not ideal, but it's better than clearing everything!`,

  `Those are both excellent suggestions, and I really appreciate
you taking the time to share that feedback with us!
Regarding the console output font size — you're absolutely right
that it could be improved. I've logged this as a feature request
with our UX team. In the meantime, there's actually a keyboard
shortcut you can use: hold Ctrl (or Cmd on Mac) and press the
plus key (+) to zoom in on just the console panel when it's focused.
It's not a perfect solution, but it should help with readability.
As for dark mode in the code editor — great news! This feature
is actually already available but a bit hidden. Click on the gear
icon in the top-right corner of the code editor panel (not the
main site settings). You'll see a dropdown called "Editor Theme"
with options including "VS Code Dark," "Monokai," and "Dracula,"
among others. Let me know if you can find it!
I want to thank you for being such a thorough and helpful user.
Your detailed bug reports have helped us identify and fix several
issues that will benefit all our students. If you run into
anything else, please don't hesitate to reach out!`,
];

async function main() {
  const ticket = await prisma.ticket.findUnique({
    where: { id: TICKET_ID },
  });

  if (!ticket) {
    console.error(`Ticket ${TICKET_ID} not found. Please ensure it exists.`);
    process.exit(1);
  }

  // Find an agent user to attribute agent replies to
  const agent = await prisma.user.findFirst({
    where: { role: "agent" },
  });
  // Fall back to any user if no agent exists
  const agentUser =
    agent ?? (await prisma.user.findFirst({ where: { role: "admin" } }));

  if (!agentUser) {
    console.error("No user found to attribute agent replies to.");
    process.exit(1);
  }

  // Delete existing replies for this ticket
  const deleted = await prisma.reply.deleteMany({
    where: { ticketId: TICKET_ID },
  });
  console.log(`Deleted ${deleted.count} existing replies for ticket ${TICKET_ID}.`);

  // Create 20 replies alternating between agent and customer
  const baseDate = new Date("2026-02-20T09:00:00Z");

  for (let i = 0; i < 20; i++) {
    const isAgent = i % 2 === 1; // Even = customer, Odd = agent
    const replyIndex = Math.floor(i / 2);
    const body = isAgent ? agentReplies[replyIndex] : customerReplies[replyIndex];

    // Space replies ~2 hours apart
    const createdAt = new Date(baseDate.getTime() + i * 2 * 60 * 60 * 1000);

    await prisma.reply.create({
      data: {
        body,
        senderType: isAgent ? "agent" : "customer",
        ticketId: TICKET_ID,
        userId: isAgent ? agentUser.id : null,
        createdAt,
      },
    });

    const sender = isAgent ? `Agent (${agentUser.name})` : "Customer";
    console.log(`Created reply ${i + 1}/20 — ${sender} at ${createdAt.toISOString()}`);
  }

  console.log(`\nDone! Seeded 20 replies for ticket ${TICKET_ID}.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
