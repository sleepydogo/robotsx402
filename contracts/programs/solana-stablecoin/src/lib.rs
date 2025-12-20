use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, MintTo, Burn, Transfer};
use mpl_token_metadata::{
    instructions::CreateMetadataAccountV3CpiBuilder,
    types::DataV2,
};

declare_id!("9LSXCUkD7BD3wjWjtC18qbrPAcfwdo4LVCER8j6CKEDj");

#[program]
pub mod solana_stablecoin {
    use super::*;

    pub fn initialize(
        ctx: Context<Initialize>,
        decimals: u8,
    ) -> Result<()> {
        let stablecoin_state = &mut ctx.accounts.stablecoin_state;
        stablecoin_state.authority = ctx.accounts.authority.key();
        stablecoin_state.mint = ctx.accounts.mint.key();
        stablecoin_state.total_supply = 0;
        stablecoin_state.paused = false;
        stablecoin_state.decimals = decimals;

        msg!("Stablecoin initialized with decimals: {}", decimals);
        Ok(())
    }

    pub fn mint_tokens(
        ctx: Context<MintTokens>,
        amount: u64,
    ) -> Result<()> {
        let stablecoin_state = &ctx.accounts.stablecoin_state;

        require!(!stablecoin_state.paused, ErrorCode::ContractPaused);
        require!(amount > 0, ErrorCode::InvalidAmount);

        let seeds = &[
            b"stablecoin".as_ref(),
            &[ctx.bumps.stablecoin_state],
        ];
        let signer = &[&seeds[..]];

        token::mint_to(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                MintTo {
                    mint: ctx.accounts.mint.to_account_info(),
                    to: ctx.accounts.to.to_account_info(),
                    authority: ctx.accounts.stablecoin_state.to_account_info(),
                },
                signer,
            ),
            amount,
        )?;

        let stablecoin_state = &mut ctx.accounts.stablecoin_state;
        stablecoin_state.total_supply = stablecoin_state.total_supply.checked_add(amount)
            .ok_or(ErrorCode::Overflow)?;

        msg!("Minted {} tokens. New total supply: {}", amount, stablecoin_state.total_supply);
        Ok(())
    }

    pub fn burn_tokens(
        ctx: Context<BurnTokens>,
        amount: u64,
    ) -> Result<()> {
        let stablecoin_state = &ctx.accounts.stablecoin_state;

        require!(!stablecoin_state.paused, ErrorCode::ContractPaused);
        require!(amount > 0, ErrorCode::InvalidAmount);

        token::burn(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Burn {
                    mint: ctx.accounts.mint.to_account_info(),
                    from: ctx.accounts.from.to_account_info(),
                    authority: ctx.accounts.authority.to_account_info(),
                },
            ),
            amount,
        )?;

        let stablecoin_state = &mut ctx.accounts.stablecoin_state;
        stablecoin_state.total_supply = stablecoin_state.total_supply.checked_sub(amount)
            .ok_or(ErrorCode::Underflow)?;

        msg!("Burned {} tokens. New total supply: {}", amount, stablecoin_state.total_supply);
        Ok(())
    }

    pub fn transfer_tokens(
        ctx: Context<TransferTokens>,
        amount: u64,
    ) -> Result<()> {
        let stablecoin_state = &ctx.accounts.stablecoin_state;

        require!(!stablecoin_state.paused, ErrorCode::ContractPaused);
        require!(amount > 0, ErrorCode::InvalidAmount);

        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.from.to_account_info(),
                    to: ctx.accounts.to.to_account_info(),
                    authority: ctx.accounts.authority.to_account_info(),
                },
            ),
            amount,
        )?;

        msg!("Transferred {} tokens", amount);
        Ok(())
    }

    pub fn pause(ctx: Context<Pause>) -> Result<()> {
        let stablecoin_state = &mut ctx.accounts.stablecoin_state;
        stablecoin_state.paused = true;

        msg!("Stablecoin contract paused");
        Ok(())
    }

    pub fn unpause(ctx: Context<Unpause>) -> Result<()> {
        let stablecoin_state = &mut ctx.accounts.stablecoin_state;
        stablecoin_state.paused = false;

        msg!("Stablecoin contract unpaused");
        Ok(())
    }

    pub fn transfer_authority(
        ctx: Context<TransferAuthority>,
        new_authority: Pubkey,
    ) -> Result<()> {
        let stablecoin_state = &mut ctx.accounts.stablecoin_state;
        stablecoin_state.authority = new_authority;

        msg!("Authority transferred to: {}", new_authority);
        Ok(())
    }

    pub fn create_metadata(
        ctx: Context<CreateMetadata>,
        name: String,
        symbol: String,
        uri: String,
    ) -> Result<()> {
        msg!("Creating metadata for token: {}", name);

        let seeds = &[
            b"stablecoin".as_ref(),
            &[ctx.bumps.stablecoin_state],
        ];
        let signer = &[&seeds[..]];

        CreateMetadataAccountV3CpiBuilder::new(&ctx.accounts.token_metadata_program.to_account_info())
            .metadata(&ctx.accounts.metadata.to_account_info())
            .mint(&ctx.accounts.mint.to_account_info())
            .mint_authority(&ctx.accounts.stablecoin_state.to_account_info())
            .payer(&ctx.accounts.authority.to_account_info())
            .update_authority(&ctx.accounts.stablecoin_state.to_account_info(), true)
            .system_program(&ctx.accounts.system_program.to_account_info())
            .data(DataV2 {
                name,
                symbol,
                uri,
                seller_fee_basis_points: 0,
                creators: None,
                collection: None,
                uses: None,
            })
            .is_mutable(true)
            .invoke_signed(signer)?;

        msg!("Metadata created successfully");
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + StablecoinState::INIT_SPACE,
        seeds = [b"stablecoin"],
        bump
    )]
    pub stablecoin_state: Account<'info, StablecoinState>,

    #[account(
        init,
        payer = authority,
        mint::decimals = 6,
        mint::authority = stablecoin_state,
    )]
    pub mint: Account<'info, Mint>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct MintTokens<'info> {
    #[account(
        mut,
        seeds = [b"stablecoin"],
        bump,
        has_one = mint,
        has_one = authority,
    )]
    pub stablecoin_state: Account<'info, StablecoinState>,

    #[account(mut)]
    pub mint: Account<'info, Mint>,

    #[account(mut)]
    pub to: Account<'info, TokenAccount>,

    pub authority: Signer<'info>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct BurnTokens<'info> {
    #[account(
        mut,
        seeds = [b"stablecoin"],
        bump,
        has_one = mint,
    )]
    pub stablecoin_state: Account<'info, StablecoinState>,

    #[account(mut)]
    pub mint: Account<'info, Mint>,

    #[account(mut)]
    pub from: Account<'info, TokenAccount>,

    pub authority: Signer<'info>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct TransferTokens<'info> {
    #[account(
        seeds = [b"stablecoin"],
        bump,
    )]
    pub stablecoin_state: Account<'info, StablecoinState>,

    #[account(mut)]
    pub from: Account<'info, TokenAccount>,

    #[account(mut)]
    pub to: Account<'info, TokenAccount>,

    pub authority: Signer<'info>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct Pause<'info> {
    #[account(
        mut,
        seeds = [b"stablecoin"],
        bump,
        has_one = authority,
    )]
    pub stablecoin_state: Account<'info, StablecoinState>,

    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct Unpause<'info> {
    #[account(
        mut,
        seeds = [b"stablecoin"],
        bump,
        has_one = authority,
    )]
    pub stablecoin_state: Account<'info, StablecoinState>,

    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct TransferAuthority<'info> {
    #[account(
        mut,
        seeds = [b"stablecoin"],
        bump,
        has_one = authority,
    )]
    pub stablecoin_state: Account<'info, StablecoinState>,

    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct CreateMetadata<'info> {
    #[account(
        seeds = [b"stablecoin"],
        bump,
        has_one = mint,
        has_one = authority,
    )]
    pub stablecoin_state: Account<'info, StablecoinState>,

    pub mint: Account<'info, Mint>,

    /// CHECK: Metaplex will create this account
    #[account(mut)]
    pub metadata: UncheckedAccount<'info>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,

    /// CHECK: Metaplex Token Metadata Program
    #[account(address = mpl_token_metadata::ID)]
    pub token_metadata_program: UncheckedAccount<'info>,
}

#[account]
#[derive(InitSpace)]
pub struct StablecoinState {
    pub authority: Pubkey,
    pub mint: Pubkey,
    pub total_supply: u64,
    pub paused: bool,
    pub decimals: u8,
}

#[error_code]
pub enum ErrorCode {
    #[msg("Contract is paused")]
    ContractPaused,
    #[msg("Invalid amount")]
    InvalidAmount,
    #[msg("Arithmetic overflow")]
    Overflow,
    #[msg("Arithmetic underflow")]
    Underflow,
}
