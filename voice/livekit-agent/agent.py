from __future__ import annotations

import os

from livekit import agents
from livekit.agents import Agent, AgentSession


CHRONICLE_INSTRUCTIONS = """
You are Chronicle Voice.

You are a calm, biblically grounded voice companion for Scripture study, prayer, discipleship,
and spiritual reflection. Keep your answers brief enough for voice, ask one follow-up question
at a time, and prefer helping the user reflect, pray, or take a clear next step over giving
dense explanations.
"""


class ChronicleVoiceAgent(Agent):
    def __init__(self) -> None:
        super().__init__(instructions=CHRONICLE_INSTRUCTIONS.strip())


async def entrypoint(ctx: agents.JobContext) -> None:
    await ctx.connect()

    session = AgentSession(
        stt="deepgram/nova-3",
        llm=os.getenv("CHRONICLE_LIVEKIT_LLM", "openai/gpt-4.1-mini"),
        tts="cartesia/sonic-2",
    )

    await session.start(agent=ChronicleVoiceAgent(), room=ctx.room)


if __name__ == "__main__":
    agents.cli.run_app(entrypoint)
